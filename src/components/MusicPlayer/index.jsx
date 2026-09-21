"use client";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  nextSong,
  prevSong,
  playPause,
  setActiveSong,
  setFullScreen,
  setQuality,
} from "../../redux/features/playerSlice";
import Controls from "./Controls";
import Player from "./Player";
import Seekbar from "./Seekbar";
import Track from "./Track";
import VolumeBar from "./VolumeBar";
import FullscreenTrack from "./FullscreenTrack";
import Lyrics from "./Lyrics";
import Downloader from "./Downloader";
import { HiOutlineChevronDown } from "react-icons/hi";
import { addFavourite, getFavourite, switchSongSource } from "@/services/dataAPI";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FavouriteButton from "./FavouriteButton";

const MusicPlayer = () => {
  const {
    activeSong,
    currentSongs,
    currentIndex,
    isActive,
    isPlaying,
    fullScreen,
    quality,
  } = useSelector((state) => state.player);
  const { isTyping } = useSelector((state) => state.loadingBar);
  const [duration, setDuration] = useState(0);
  const [seekTime, setSeekTime] = useState(0);
  const [appTime, setAppTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [favouriteSongs, setFavouriteSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sourceSwitching, setSourceSwitching] = useState(false);
  const [queueProvider, setQueueProvider] = useState(null);
  const dispatch = useDispatch();
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const savedQuality = window.localStorage.getItem("chilladda-audio-quality");
    if (savedQuality) dispatch(setQuality(savedQuality));
  }, [dispatch]);

  const handleQualityChange = (value) => {
    dispatch(setQuality(value));
    window.localStorage.setItem("chilladda-audio-quality", value);
  };

  useEffect(() => {
    if (currentSongs?.length) dispatch(playPause(true));
  }, [currentIndex]);

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        setLoading(true);
        const res = await getFavourite();
        // console.log("favourites",res);
        if (res) {
          setFavouriteSongs(res);
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchFavourites();
  }, []);

  useEffect(() => {
    if (activeSong?.name) document.title = activeSong.name;
  }, [activeSong?.name]);

  useEffect(() => {
    if (!activeSong?.id) return;
    setSeekTime(0);
    setAppTime(0);
  }, [activeSong?.id, activeSong?.provider, activeSong?.trackId, activeSong?.sourceKey]);

  // off scroll when full screen
  useEffect(() => {
    document.documentElement.style.overflow = fullScreen ? "hidden" : "auto";

    return () => {
      document.documentElement.style.overflow = "auto";
    };
  }, [fullScreen]);

  // Hotkey for play pause
  const handleKeyPress = (event) => {
    // Check if the pressed key is the spacebar (keyCode 32 or key " ")
    if (!isTyping && (event.keyCode === 32 || event.key === " ")) {
      event.preventDefault();
      handlePlayPause();
    }
  };
  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  const handlePlayPause = (e) => {
    e?.stopPropagation();
    if (!isActive) return;

    if (isPlaying) {
      dispatch(playPause(false));
    } else {
      dispatch(playPause(true));
    }
  };

  const handleNextSong = async (e) => {
    e?.stopPropagation();
    dispatch(playPause(false));
    setSeekTime(0);

    const nextIndex = !shuffle
      ? (currentIndex + 1) % currentSongs.length
      : Math.floor(Math.random() * currentSongs.length);
    const queuedSong = currentSongs[nextIndex];

    if (queueProvider && queuedSong?.provider !== queueProvider) {
      try {
        const replacement = await switchSongSource(queuedSong, queueProvider);
        if (replacement) {
          dispatch(setActiveSong({ song: replacement, data: currentSongs, i: nextIndex }));
          dispatch(playPause(true));
          return;
        }
      } catch {
        // Fall back to the original playlist item when the alternate source is unavailable.
      }
    }
    dispatch(nextSong(nextIndex));
  };

  const handlePrevSong = (e) => {
    e?.stopPropagation();
    setSeekTime(0);
    if (currentIndex === 0) {
      dispatch(prevSong(currentSongs.length - 1));
    } else if (shuffle) {
      dispatch(prevSong(Math.floor(Math.random() * currentSongs.length)));
    } else {
      dispatch(prevSong(currentIndex - 1));
    }
  };

  const handleAddToFavourite = async (favsong) => {
    if (status === "unauthenticated") {
      dispatch(setFullScreen(false));
      router.push("/login");
    }

    if (favsong?.id && status === "authenticated") {
      try {
        setLoading(true);
        // optimistic update
        if (favouriteSongs?.find((song) => song === favsong?.id)) {
          setFavouriteSongs(
            favouriteSongs?.filter((song) => song !== favsong?.id)
          );
        } else {
          setFavouriteSongs([...favouriteSongs, favsong?.id]);
        }
        const res = await addFavourite(favsong);
        if (res?.success === true) {
          setFavouriteSongs(res?.data?.favourites);
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.log("add to fav error", error);
      }
    }
  };

  const handleSwitchSource = async () => {
    if (sourceSwitching || !activeSong?.name) return;
    const target = activeSong.provider === "legacy" ? "gaana" : "legacy";
    const wasPlaying = isPlaying;
    setSourceSwitching(true);
    dispatch(playPause(false));
    try {
      const replacement = await switchSongSource(activeSong, target);
      if (!replacement) {
        toast.error(`No ${target === "gaana" ? "Gaana" : "JioSaavn"} result found`);
        dispatch(playPause(wasPlaying));
        return;
      }
      setQueueProvider(target);
      setSeekTime(0);
      dispatch(
        setActiveSong({
          song: { ...replacement, sourceKey: `${target}:${Date.now()}` },
          data: currentSongs,
          i: currentIndex,
        })
      );
      dispatch(playPause(true));
    } catch (error) {
      console.error("Source switch failed", {
        target,
        activeSong,
        error,
      });
      toast.error("Unable to switch music source");
      dispatch(playPause(wasPlaying));
    } finally {
      setSourceSwitching(false);
    }
  };

  return (
    <div
      className={`relative overflow-scroll items-center lg:items-stretch lg:overflow-visible hideScrollBar sm:px-12  flex flex-col transition-all duration-100 ${
        fullScreen ? "h-[100vh] w-[100vw]" : "w-full h-20 px-8 bg-black "
      }`}
      onClick={() => {
        if (activeSong?.id) {
          dispatch(setFullScreen(!fullScreen));
        }
      }}
      style={{
        backgroundColor: "rgba(0,0,0,0.2)",
      }}
    >
      <HiOutlineChevronDown
        onClick={(e) => {
          e.stopPropagation();
          dispatch(setFullScreen(!fullScreen));
        }}
        className={` absolute top-16 md:top-10 right-7 text-white text-3xl cursor-pointer ${
          fullScreen ? "" : "hidden"
        }`}
      />
      <FullscreenTrack
        handleNextSong={handleNextSong}
        handlePrevSong={handlePrevSong}
        activeSong={activeSong}
        fullScreen={fullScreen}
      />
      <div className=" flex items-center justify-between pt-2">
        <Track
          isPlaying={isPlaying}
          isActive={isActive}
          activeSong={activeSong}
          fullScreen={fullScreen}
        />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div
            className={`${
              fullScreen ? "" : "hidden"
            }  sm:hidden flex items-center justify-center gap-4`}
          >
            <FavouriteButton
              favouriteSongs={favouriteSongs}
              activeSong={activeSong}
              loading={loading}
              handleAddToFavourite={handleAddToFavourite}
              style={"mb-4"}
            />
            <div className={`mb-3 sm:hidden flex items-center justify-center`}>
              <Downloader activeSong={activeSong} fullScreen={fullScreen} />
            </div>
          </div>
          <Controls
            isPlaying={isPlaying}
            isActive={isActive}
            repeat={repeat}
            setRepeat={setRepeat}
            shuffle={shuffle}
            setShuffle={setShuffle}
            currentSongs={currentSongs}
            activeSong={activeSong}
            fullScreen={fullScreen}
            handlePlayPause={handlePlayPause}
            handlePrevSong={handlePrevSong}
            handleNextSong={handleNextSong}
            handleAddToFavourite={handleAddToFavourite}
            favouriteSongs={favouriteSongs}
            loading={loading}
            onSwitchSource={handleSwitchSource}
            sourceSwitching={sourceSwitching}
            quality={quality}
            onQualityChange={handleQualityChange}
          />
          <Seekbar
            value={appTime}
            min="0"
            max={duration}
            fullScreen={fullScreen}
            onInput={(event) => setSeekTime(event.target.value)}
            setSeekTime={setSeekTime}
            appTime={appTime}
          />
          <Player
            key={`${activeSong?.sourceKey || ""}:${activeSong?.provider || "unknown"}:${activeSong?.id || "none"}:${activeSong?.trackId || ""}`}
            activeSong={activeSong}
            volume={volume}
            isPlaying={isPlaying}
            seekTime={seekTime}
            repeat={repeat}
            currentIndex={currentIndex}
            onEnded={handleNextSong}
            handlePlayPause={handlePlayPause}
            handleNextSong={handleNextSong}
            handlePrevSong={handlePrevSong}
            onTimeUpdate={(event) => setAppTime(event.target.currentTime)}
            onLoadedData={(event) => setDuration(event.target.duration)}
            appTime={appTime}
            setSeekTime={setSeekTime}
            quality={quality}
          />
        </div>
        <VolumeBar
          activeSong={activeSong}
          fullScreen={fullScreen}
          value={volume}
          min="0"
          max="1"
          onChange={(event) => setVolume(event.target.value)}
          setVolume={setVolume}
        />
      </div>
      {fullScreen && (
        <div className=" lg:hidden">
          <Lyrics activeSong={activeSong} currentSongs={currentSongs} />
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;
