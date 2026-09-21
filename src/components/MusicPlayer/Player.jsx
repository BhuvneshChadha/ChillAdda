"use client";
/* eslint-disable jsx-a11y/media-has-caption */
import React, { useRef, useEffect } from "react";
import { resolveSongStream } from "@/services/dataAPI";
import Hls from "hls.js";

const Player = ({
  activeSong,
  isPlaying,
  volume,
  seekTime,
  onEnded,
  onTimeUpdate,
  onLoadedData,
  repeat,
  handlePlayPause,
  handlePrevSong,
  handleNextSong,
  setSeekTime,
  appTime,
  quality,
}) => {
  const ref = useRef(null);
  const hlsRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const [source, setSource] = React.useState("");

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // media session metadata:
  const mediaMetaData = activeSong?.name
    ? {
        title: activeSong?.name,
        artist: activeSong?.primaryArtists,
        album: activeSong?.album?.name,
        artwork: [
          {
            src: activeSong?.image?.[2]?.url,
            sizes: "500x500",
            type: "image/jpg",
          },
        ],
      }
    : {};
  useEffect(() => {
    // Check if the Media Session API is available in the browser environment
    if ("mediaSession" in navigator) {
      // Set media metadata
      navigator.mediaSession.metadata = new window.MediaMetadata(mediaMetaData);

      // Define media session event handlers
      navigator.mediaSession.setActionHandler("play", onPlay);
      navigator.mediaSession.setActionHandler("pause", onPause);
      navigator.mediaSession.setActionHandler("previoustrack", onPreviousTrack);
      navigator.mediaSession.setActionHandler("nexttrack", onNextTrack);
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        setSeekTime(appTime - 5);
      });
      navigator.mediaSession.setActionHandler("seekforward", () => {
        setSeekTime(appTime + 5);
      });
    }
  }, [mediaMetaData]);
  // media session handlers:
  const onPlay = () => {
    handlePlayPause();
  };

  const onPause = () => {
    handlePlayPause();
  };

  const onPreviousTrack = () => {
    handlePrevSong();
  };

  const onNextTrack = () => {
    handleNextSong();
  };

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);
  // updates audio element only on seekTime change (and not on each rerender):
  useEffect(() => {
    if (ref.current) ref.current.currentTime = seekTime;
  }, [seekTime]);

  useEffect(() => {
    let cancelled = false;
    const loadSource = async () => {
      const audio = ref.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      const stream = await resolveSongStream(activeSong, quality);
      if (cancelled) return;
      setSource(stream);
      if (!ref.current || !stream) return;

      const canPlayHls = audio.canPlayType("application/vnd.apple.mpegurl");
      const isHlsStream = /\.m3u8(?:$|\?)/i.test(stream);
      const playWhenReady = () => {
        if (!cancelled && isPlayingRef.current) {
          audio.play().catch(() => {});
        }
      };

      if (canPlayHls || !isHlsStream) {
        audio.oncanplay = playWhenReady;
        audio.src = stream;
        audio.load();
        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          playWhenReady();
        }
      } else {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          console.error("This browser does not support HLS playback.");
          return;
        }
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(stream);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          playWhenReady();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error("Gaana HLS playback error:", data);
            hls.destroy();
            hlsRef.current = null;
          }
        });
        return;
      }

      playWhenReady();
    };
    if (activeSong?.id) loadSource();
    else {
      setSource("");
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (ref.current) {
        ref.current.removeAttribute("src");
        ref.current.load();
      }
    }
    return () => {
      cancelled = true;
      if (ref.current) {
        ref.current.oncanplay = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [
    activeSong?.id,
    activeSong?.trackId,
    activeSong?.provider,
    activeSong?.sourceKey,
    activeSong?.streamUrl,
    activeSong?.downloadUrl,
    quality,
  ]);

  useEffect(() => {
    if (!ref.current) return;
    if (isPlaying) ref.current.play().catch(() => {});
    else ref.current.pause();
  }, [isPlaying]);

  return (
    <>
      <audio
        ref={ref}
        loop={repeat}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
        onLoadedData={onLoadedData}
        onError={(event) => {
          if (event.currentTarget.error) {
            console.error("Audio playback error:", event.currentTarget.error);
          }
        }}
      />
    </>
  );
};

export default Player;
