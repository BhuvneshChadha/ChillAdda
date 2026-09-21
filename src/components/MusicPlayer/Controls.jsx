"use client";
import React from "react";
import { MdSkipNext, MdSkipPrevious, MdSwapHoriz } from "react-icons/md";
import { BsFillPauseFill, BsFillPlayFill } from "react-icons/bs";
import { TbRepeat, TbRepeatOnce, TbArrowsShuffle } from "react-icons/tb";
import Downloader from "./Downloader";
import FavouriteButton from "./FavouriteButton";

const Controls = ({
  isPlaying,
  repeat,
  setRepeat,
  shuffle,
  setShuffle,
  currentSongs,
  handlePlayPause,
  handlePrevSong,
  handleNextSong,
  activeSong,
  fullScreen,
  handleAddToFavourite,
  favouriteSongs,
  loading,
  onSwitchSource,
  sourceSwitching,
  quality,
  onQualityChange,
}) => {
  return (
    <div className="flex items-center justify-around md:w-80 text-lg lg:w-80 2xl:w-80 gap-4 sm:gap-0">
      <FavouriteButton
        favouriteSongs={favouriteSongs}
        activeSong={activeSong}
        loading={loading}
        handleAddToFavourite={handleAddToFavourite}
        style={" sm:block hidden"}
      />
      {!repeat ? (
        <TbRepeat
          title="Repeat"
          size={25}
          color={"white"}
          onClick={(e) => {
            e.stopPropagation();
            setRepeat((prev) => !prev);
          }}
          className={`${
            !fullScreen ? "hidden sm:block" : " m-3"
          } cursor-pointer`}
        />
      ) : (
        <TbRepeatOnce
          title="Repeat Once"
          size={25}
          color={repeat ? "#00e6e6" : "white"}
          onClick={(e) => {
            e.stopPropagation();
            setRepeat((prev) => !prev);
          }}
          className={`${
            !fullScreen ? "hidden sm:block" : " m-3"
          } cursor-pointer`}
        />
      )}

      {
        <MdSkipPrevious
          title="Previous"
          size={35}
          color={currentSongs?.length ? "#ffff" : "#b3b3b3"}
          className="cursor-pointer"
          onClick={handlePrevSong}
        />
      }
      {isPlaying ? (
        <BsFillPauseFill
          size={45}
          color="#00e6e6"
          onClick={handlePlayPause}
          className="cursor-pointer"
        />
      ) : (
        <BsFillPlayFill
          size={45}
          color="#00e6e6"
          onClick={handlePlayPause}
          className="cursor-pointer"
        />
      )}
      {
        <MdSkipNext
          title="Next"
          size={35}
          color={currentSongs?.length ? "#ffff" : "#b3b3b3"}
          className="cursor-pointer"
          onClick={handleNextSong}
        />
      }
      <TbArrowsShuffle
        title="Shuffle"
        size={25}
        color={shuffle ? "#00e6e6" : "white"}
        onClick={(e) => {
          e.stopPropagation();
          setShuffle((prev) => !prev);
        }}
        className={`${!fullScreen ? "hidden sm:block" : "m-3"} cursor-pointer`}
      />
      {/^\d+$/.test(String(activeSong?.trackId || activeSong?.id || "")) && (
        <div className=" hidden sm:block mt-1 ">
          <Downloader activeSong={activeSong} fullScreen={fullScreen} />
        </div>
      )}
      {activeSong?.name && (
        <button
          type="button"
          title={`Switch to ${activeSong.provider === "legacy" ? "Gaana" : "JioSaavn"}`}
          onClick={(event) => {
            event.stopPropagation();
            onSwitchSource?.();
          }}
          disabled={sourceSwitching}
          className="flex items-center gap-1 text-xs text-white hover:text-[#00e6e6] disabled:opacity-50"
        >
          <MdSwapHoriz size={24} />
          {/* <span className="hidden sm:inline">
            {sourceSwitching
              ? "Loading"
              : activeSong.provider === "legacy"
                ? "Gaana"
                : "JioSaavn"}
          </span> */}
        </button>
      )}
      {activeSong?.provider !== "legacy" && (
        <select
          aria-label="Audio quality"
          title="Audio quality"
          value={quality}
          onChange={(event) => onQualityChange?.(event.target.value)}
          className="hidden sm:block bg-transparent text-xs text-white outline-none"
        >
          <option value="high" className="bg-black">High</option>
          <option value="medium" className="bg-black">Medium</option>
          <option value="low" className="bg-black">Low</option>
        </select>
      )}
    </div>
  );
};

export default Controls;
