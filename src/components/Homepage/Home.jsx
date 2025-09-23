"use client";
import { homePageData } from "@/services/dataAPI";
import React from "react";
import { useEffect, useState } from "react";
import { SwiperSlide } from "swiper/react";
import SongCard from "./SongCard";
import { useDispatch, useSelector } from "react-redux";
import SwiperLayout from "./Swiper";
import { setProgress } from "@/redux/features/loadingBarSlice";
import SongCardSkeleton from "./SongCardSkeleton";
import { GiMusicalNotes } from 'react-icons/gi'
import SongBar from "./SongBar";
import OnlineStatus from "./OnlineStatus";
import ListenAgain from "./ListenAgain";


const Home = () => {
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { activeSong, isPlaying, } = useSelector((state) => state.player);
  const { languages } = useSelector((state) => state.languages);

  // salutation
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const salutationTranslations = {
    english: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    },
    hindi: {
      common: "नमस्ते", 
    },
    punjabi: {
      common: "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ", 
    },
    rajasthani: {
      common: "राम राम सा", 
    },
    haryanvi: {
      common: "राम राम", 
    },
    tamil: {
      morning: "காலை வணக்கம்",
      afternoon: "வணக்கம்",
      evening: "மாலை வணக்கம்",
    },
    telugu: {
      morning: "శుభోదయం",
      afternoon: "నమస్తే",
      evening: "శుభ సాయంత్రం",
    },
    odia: {
      morning: "ସୁପ୍ରଭାତ",
      afternoon: "ନମସ୍କାର",
      evening: "ଶୁଭ ସନ୍ଧ୍ୟା",
    },
  };

  function getSalutation(hour, languages) {
    let selectedLang = "english"; // fallback

    if (languages?.length === 1) {
      selectedLang = languages[0];
    } else if (languages?.length > 1) {
      // just pick the first valid language from array
      selectedLang = languages[0];
    }

    const translations = salutationTranslations[selectedLang];

    if (!translations) {
      return salutationTranslations["english"].morning; // fallback
    }

    // if language has only a "common" salutation (like punjabi/hindi/raj)
    if (translations.common) {
      return translations.common;
    }

    // else decide based on time
    let period = "";
    if (hour >= 5 && hour < 12) period = "morning";
    else if (hour >= 12 && hour < 18) period = "afternoon";
    else period = "evening";

    return translations[period] || salutationTranslations["english"].morning;
  } 

  let salutation = '';
  salutation = getSalutation(currentHour, languages);

  useEffect(() => {
    const fetchData = async () => {
      dispatch(setProgress(70))
      const res = await homePageData(languages);
      setData(res);
      dispatch(setProgress(100))
      setLoading(false);
    };
    fetchData();
  }, [languages]);



  return (
    <div>
      <OnlineStatus />
      <h1 className='text-4xl font-bold mx-2 m-9 text-white flex gap-2'>"{salutation}  <GiMusicalNotes />"</h1>

      <ListenAgain />

      {/* trending */}
      <SwiperLayout title={"Trending"} >
        {
          loading ? (
            <SongCardSkeleton />
          ) : (
            <>
              {data?.trending?.songs?.map(
                (song) =>
                (
                  <SwiperSlide key={song?.id}>
                    <SongCard song={song} activeSong={activeSong} isPlaying={isPlaying} />
                  </SwiperSlide>
                )
              )}

              {data?.trending?.albums?.map(
                (song) =>
                (
                  <SwiperSlide key={song?.id}>
                    <SongCard song={song} activeSong={activeSong} isPlaying={isPlaying} />
                  </SwiperSlide>
                )
              )}
            </>
          )
        }
      </SwiperLayout>

      {/* top charts */}
      <div className="my-4 lg:mt-14">
        <h2 className=" text-white mt-4 text-2xl lg:text-3xl font-semibold mb-4 ">Top Charts</h2>
        <div className="grid lg:grid-cols-2 gap-x-10 max-h-96 lg:max-h-full lg:overflow-y-auto overflow-y-scroll">
          {
            loading ? (
              <div className=" w-[90vw] overflow-x-hidden">
                <SongCardSkeleton />
              </div>
            ) : (
              data?.charts?.slice(0, 10)?.map(
                (playlist, index) =>
                (
                  <SongBar key={playlist?.id} playlist={playlist} i={index} />
                ))
            )
          }
        </div>
      </div>

      {/* New Releases */}
      <SwiperLayout title={"New Releases"}>
        {
          loading ? (
            <SongCardSkeleton />
          ) : (
            data?.albums?.map(
              (song) =>
              (
                <SwiperSlide key={song?.id}>
                  <SongCard song={song} activeSong={activeSong} isPlaying={isPlaying} />
                </SwiperSlide>
              )
            )
          )
        }
      </SwiperLayout>

      {/* featured playlists */}
      <SwiperLayout title={"Featured Playlists"}>
        {
          loading ? (
            <SongCardSkeleton />
          ) : (
            data?.playlists?.map(
              (song) =>
              (
                <SwiperSlide key={song?.id}>
                  <SongCard key={song?.id} song={song} activeSong={activeSong} isPlaying={isPlaying} />
                </SwiperSlide>
              )
            )
          )
        }
      </SwiperLayout>

    </div>
  );
};

export default Home;