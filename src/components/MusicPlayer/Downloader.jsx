"use client";
import React from "react";
import { MdOutlineFileDownload } from "react-icons/md";
import useDownloader from "react-use-downloader";
import { MdDownloadForOffline } from "react-icons/md";
import { toast } from "react-hot-toast";

const Downloader = ({ activeSong, icon }) => {
  const { percentage, isInProgress, download } = useDownloader();
  const [loading, setLoading] = React.useState(false);
  const isLegacy = activeSong?.provider === "legacy";
  const trackId = activeSong?.trackId || activeSong?.id;
  const directUrl = activeSong?.downloadUrl?.[4]?.url ||
    activeSong?.downloadUrl?.[0]?.url ||
    activeSong?.streamUrl;
  const canDownload = isLegacy
    ? Boolean(directUrl)
    : /^\d+$/.test(String(trackId || ""));
  const apiUrl = (process.env.NEXT_PUBLIC_GAANA_API || "").replace(/\/$/, "");
  const filename = `${activeSong?.name
    ?.replace("&#039;", "'")
    ?.replace("&amp;", "&")}.mp3`;

  return (
    <div
      onClick={async (e) => {
        e.stopPropagation();
        if (loading || isInProgress || !canDownload) {
          if (!canDownload) toast.error("Download unavailable for this song");
          return;
        }
        setLoading(true);
        try {
          const response = await fetch(
            isLegacy
              ? directUrl
              : `${apiUrl}/api/download/${encodeURIComponent(trackId)}?name=${encodeURIComponent(activeSong?.name || "song")}`
          );
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error || "Download unavailable");
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = filename;
          anchor.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          toast.error(error.message || "Unable to download song");
        } finally {
          setLoading(false);
        }
      }}
      className={`flex items-center justify-center mb-1 cursor-pointer w-8 min-w-8`}
    >
      <div
        title={loading || isInProgress ? "Downloading" : "Download"}
        className={
          loading || isInProgress
            ? "download-button flex min-w-8 justify-center items-center px-1"
            : ""
        }
      >
        {loading || isInProgress ? (
          <div className="text-white font-extrabold text-xs whitespace-nowrap">
            {percentage}
          </div>
        ) : icon === 2 ? (
          <MdDownloadForOffline size={25} color={"#ffff"} />
        ) : (
          <MdOutlineFileDownload size={25} color={"#ffff"} />
        )}
      </div>
    </div>
  );
};

export default Downloader;
