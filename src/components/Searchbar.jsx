'use client'
import React, { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setIsTyping } from '@/redux/features/loadingBarSlice';
import { getSearchSuggestions } from '@/services/dataAPI';


const Searchbar = () => {
  const ref = React.useRef(null);
  const inputRef = React.useRef(null);
  const focusedRef = React.useRef(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const value = searchTerm.trim();
    if (!value) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await getSearchSuggestions(value);
      if (!cancelled && focusedRef.current) {
        setSuggestions(results);
        setShowSuggestions(true);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    const handleOutsidePointer = (event) => {
      if (!ref.current?.contains(event.target)) {
        focusedRef.current = false;
        inputRef.current?.blur();
        setShowSuggestions(false);
        dispatch(setIsTyping(false));
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = searchTerm.trim();
    inputRef.current?.blur();
    focusedRef.current = false;
    setShowSuggestions(false);
    if (!value) return;
    router.push(`/search/${encodeURIComponent(value)}`);
  };
  const handleFocus = () => {
    focusedRef.current = true;
    dispatch(setIsTyping(true));
  };
  const handleBlur = () => {
    focusedRef.current = false;
    dispatch(setIsTyping(false));
    setShowSuggestions(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => event.stopPropagation()}
      autoComplete="off"
      ref={ref}
      className="search-form p-2 text-gray-400 relative focus-within:text-gray-600"
    >
      <label htmlFor="search-field" className="sr-only">
        Search all files
      </label>
      <div className="flex flex-row justify-start items-center">
        <FiSearch aria-hidden="true" className="w-5 h-5 ml-4 text-gray-300" />
        <input
        ref={inputRef}
        onFocus={handleFocus}
        onClick={() => searchTerm.trim() && setShowSuggestions(true)}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Enter") {
              event.currentTarget.form?.requestSubmit();
            } else {
              inputRef.current?.blur();
              setShowSuggestions(false);
            }
          }
        }}
          name="search-field"
          autoComplete="off"
          id="search-field"
          className="flex-1 bg-transparent w-32 focus:border-b border-white lg:w-64 placeholder-gray-300 outline-none text-base text-white p-4"
          placeholder="Search"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions absolute left-2 right-2 top-full z-[100] overflow-hidden rounded-xl border border-white/10 shadow-2xl">
          {suggestions.map((song) => (
            <button
              type="button"
              key={song.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSearchTerm(song.name);
                inputRef.current?.blur();
                setShowSuggestions(false);
                router.push(`/search/${encodeURIComponent(song.name)}`);
              }}
              className="block w-full truncate px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
            >
              <span className="font-medium">{song.name}</span>
              {song.primaryArtists && (
                <span className="ml-2 text-xs text-gray-400">
                  {song.primaryArtists}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

export default Searchbar;