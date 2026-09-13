const GAANA_API = (process.env.NEXT_PUBLIC_GAANA_API || "").replace(/\/$/, "");
const LEGACY_API = (process.env.NEXT_PUBLIC_SAAVN_API || "").replace(/\/$/, "");
const FALLBACK_IMAGE =
  "https://i.postimg.cc/LX4pgWYM/cb18a5e4-dd44-48f7-97c4-b46cde6f7c60.jpg";
const streamCache = new Map();

const isObject = (value) => value !== null && typeof value === "object";
const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;
const decodeHtml = (value) =>
  String(value || "")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const unwrapGaana = (payload) => {
  let value = payload;
  while (isObject(value) && "data" in value && value.success !== false) {
    value = value.data;
  }
  return value;
};

async function requestJson(url, options = {}, timeout = 10000) {
  if (!url) throw new Error("Missing API URL");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function tryProviders(primary, legacy, isValid) {
  try {
    const value = await primary();
    if (isValid(value)) return value;
  } catch {}
  try {
    const value = await legacy();
    if (isValid(value)) return value;
  } catch {}
  return null;
}

const imageUrl = (value) => {
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value)) {
    return (
      value
        .map((item) => (typeof item === "string" ? item : item?.url || item?.link))
        .find(Boolean) || FALLBACK_IMAGE
    );
  }
  return FALLBACK_IMAGE;
};

const imageSet = (value) => {
  const url = imageUrl(value);
  return [
    { quality: "low", url },
    { quality: "medium", url },
    { quality: "high", url },
  ];
};

const artistsFrom = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((artist) => ({
        id: artist?.artist_id || artist?.id || artist?.seokey || "",
        name: decodeHtml(artist?.name || ""),
      }))
      .filter((artist) => artist.name);
  }
  return String(value || "")
    .split(",")
    .map((name) => ({ id: "", name: name.trim() }))
    .filter((artist) => artist.name);
};

const normalizeSong = (raw, source = "gaana") => {
  raw = unwrapGaana(raw);
  if (!isObject(raw)) return null;
  const songId = raw.id || raw.seokey || raw.track_id || raw.entity_id;
  const name = raw.name || raw.title || raw.track_title;
  if (!songId || !name) return null;

  const artists = artistsFrom(raw.artists?.primary || raw.artists || raw.artist || raw.artists_string);
  const song = {
    ...raw,
    id: String(songId),
    name: decodeHtml(name),
    title: decodeHtml(raw.title || name),
    type: "song",
    year: raw.year || null,
    duration: Number(raw.duration || 0),
    image: imageSet(raw.image || raw.artworkUrl || raw.artwork),
    artists: { primary: artists, featured: [], all: artists },
    primaryArtists: artists.map((artist) => artist.name).join(", "),
    primaryArtistsId: artists.map((artist) => artist.id).filter(Boolean).join(","),
    album: {
      id: raw.album?.id || raw.album_seokey || "",
      name: decodeHtml(raw.album?.name || raw.album || ""),
      url: raw.album?.url || raw.album_url || "",
    },
    seokey: raw.seokey || (source === "gaana" ? String(songId) : ""),
    trackId: raw.track_id || raw.entity_id || "",
    provider: source,
  };

  if (raw.downloadUrl) song.downloadUrl = raw.downloadUrl;
  if (raw.streamUrl) song.streamUrl = raw.streamUrl;
  return song;
};

const normalizeAlbum = (raw) => {
  raw = unwrapGaana(raw);
  if (!isObject(raw)) return null;
  const id = raw.id || raw.seokey || raw.album_id;
  const name = raw.name || raw.title;
  if (!id || !name) return null;
  const songs = (raw.songs || raw.tracks || []).map((song) => normalizeSong(song)).filter(Boolean);
  return {
    ...raw,
    id: String(id),
    name,
    title: name,
    type: "album",
    image: imageSet(raw.image || raw.artworkUrl || raw.artwork),
    subtitle: decodeHtml(raw.subtitle || raw.artists || raw.artists_string || ""),
    primaryArtists: decodeHtml(raw.primaryArtists || raw.artists || raw.artists_string || ""),
    primaryArtistsId: raw.primaryArtistsId || "",
    songs,
    songCount: raw.songCount || raw.track_count || songs.length,
  };
};

const normalizeAlbumListItem = (raw) => {
  if (!isObject(raw)) return null;
  const id = raw.seokey || raw.album_id;
  const name = raw.title || raw.name;
  if (!id || !name) return null;
  return {
    ...raw,
    id: String(id),
    name: decodeHtml(name),
    title: decodeHtml(name),
    type: "album",
    image: imageSet(raw.artworkUrl || raw.image),
    subtitle: decodeHtml(raw.artists_string || ""),
    primaryArtists: decodeHtml(raw.artists_string || ""),
    primaryArtistsId: (raw.artists || [])
      .map((artist) => artist?.artist_id)
      .filter(Boolean)
      .join(","),
    songs: [],
  };
};

const normalizeLyricsSong = (raw) => {
  if (!isObject(raw)) return null;
  const id = raw.seokey || raw.track_id;
  const name = raw.title;
  if (!id || !name) return null;
  return {
    ...raw,
    id: String(id),
    name: decodeHtml(name),
    title: decodeHtml(name),
    type: "song",
    image: imageSet(raw.artworkUrl),
    artists: { primary: [], featured: [], all: [] },
    primaryArtists: "",
    primaryArtistsId: "",
    album: { id: "", name: "", url: "" },
    seokey: String(raw.seokey || id),
    trackId: raw.track_id || "",
    provider: "gaana",
  };
};

const normalizePlaylist = (raw) => {
  const value = unwrapGaana(raw)?.playlist || unwrapGaana(raw);
  if (!isObject(value)) return null;
  const id = value.id || value.seokey || value.playlist_id;
  const name = value.name || value.title;
  if (!id || !name) return null;
  const songs = (value.songs || value.tracks || []).map((song) => normalizeSong(song)).filter(Boolean);
  return {
    ...value,
    id: String(id),
    name,
    title: name,
    type: "playlist",
    image: imageSet(value.image || value.artworkUrl || value.artwork),
    description: decodeHtml(value.description || ""),
    songs,
  };
};

const normalizeArtist = (raw) => {
  raw = unwrapGaana(raw);
  if (!isObject(raw)) return null;
  const id = raw.id || raw.seokey || raw.artist_id;
  const name = raw.name || raw.title;
  if (!id || !name) return null;
  return {
    ...raw,
    id: String(id),
    name: decodeHtml(name),
    title: decodeHtml(name),
    type: "artist",
    image: imageSet(raw.image || raw.artwork),
    songs: (raw.songs || raw.top_tracks || []).map((song) => normalizeSong(song)).filter(Boolean),
    albums: (raw.albums || []).map(normalizeAlbum).filter(Boolean),
  };
};

const normalizeSearch = (raw) => {
  const value = unwrapGaana(raw) || {};
  const songs = (unwrapGaana(value.songs) || []).map(normalizeSong).filter(Boolean);
  const albums = (unwrapGaana(value.albums) || []).map(normalizeAlbum).filter(Boolean);
  const playlists = (unwrapGaana(value.playlists) || []).map(normalizePlaylist).filter(Boolean);
  const artists = (unwrapGaana(value.artists) || []).map(normalizeArtist).filter(Boolean);
  return {
    songs: { results: songs },
    albums: { results: albums },
    playlists: { results: playlists },
    artists: { results: artists },
  };
};

const gaana = (path) => `${GAANA_API}/api${path}`;
const legacy = (path) => `${LEGACY_API}/api${path}`;

async function gaanaData(path, options) {
  return unwrapGaana(await requestJson(gaana(path), options));
}

async function legacyData(path, options) {
  const payload = await requestJson(legacy(path), options);
  return payload?.data;
}

export async function homePageData(language = []) {
  const lang = Array.isArray(language) && language.length ? language[0] : "en";
  const result = await tryProviders(
    async () => {
      const [trending, charts, releases, albumList, lyricsList] = await Promise.allSettled([
        gaanaData(`/trending?language=${encodeURIComponent(lang)}&limit=20`),
        gaanaData("/charts?limit=10"),
        gaanaData(`/new-releases?language=${encodeURIComponent(lang)}&limit=20`),
        gaanaData(`/album-list?language=${encodeURIComponent(lang)}&page=0`),
        gaanaData("/lyrics?page=0"),
      ]);
      const songs = (trending.status === "fulfilled" ? trending.value?.tracks || trending.value : [])
        .map(normalizeSong)
        .filter(Boolean);
      const chartsData = (charts.status === "fulfilled" ? charts.value : [])
        .map(normalizePlaylist)
        .filter(Boolean);
      const albums = (releases.status === "fulfilled" ? releases.value : [])
        .filter((item) => item?.type === "album")
        .map(normalizeAlbum)
        .filter(Boolean);
      const releasesSongs = (releases.status === "fulfilled" ? releases.value : [])
        .filter((item) => item?.type !== "album")
        .map(normalizeSong)
        .filter(Boolean);
      const languageAlbums = (albumList.status === "fulfilled" ? albumList.value : [])
        .map(normalizeAlbumListItem)
        .filter(Boolean);
      const lyricsSongs = (lyricsList.status === "fulfilled" ? lyricsList.value : [])
        .map(normalizeLyricsSong)
        .filter(Boolean);
      if (!songs.length && !chartsData.length && !albums.length && !releasesSongs.length) return null;
      return {
        trending: { songs: [...songs, ...releasesSongs].slice(0, 20), albums: [] },
        charts: chartsData,
        albums,
        languageAlbums,
        lyricsSongs,
        playlists: chartsData,
      };
    },
    () => legacyData(`/modules?language=${encodeURIComponent(lang)}`),
    (value) =>
      isObject(value) &&
      (isNonEmptyArray(value?.trending?.songs) ||
        isNonEmptyArray(value?.charts) ||
        isNonEmptyArray(value?.languageAlbums) ||
        isNonEmptyArray(value?.lyricsSongs))
  );
  return result || {
    trending: { songs: [], albums: [] },
    charts: [],
    albums: [],
    languageAlbums: [],
    lyricsSongs: [],
    playlists: [],
  };
}

export async function getSongData(id) {
  const value = await tryProviders(
    async () => normalizeSong(await gaanaData(`/songs/${encodeURIComponent(id)}`)),
    async () => (await legacyData(`/songs/${encodeURIComponent(id)}`))?.map((song) => normalizeSong(song, "legacy")) || [],
    (result) => (Array.isArray(result) ? result.length > 0 : Boolean(result?.id))
  );
  const song = Array.isArray(value) ? value[0] : value;
  if (!song) return [];
  if (song.provider === "gaana") {
    const stream = await resolveSongStream(song);
    if (stream) {
      song.streamUrl = stream;
      song.downloadUrl = [{ url: stream }, { url: stream }, { url: stream }, { url: stream }, { url: stream }];
    }
  }
  return [song];
}

export async function resolveSongStream(song) {
  if (song?.streamUrl) return song.streamUrl;
  if (song?.provider === "gaana" && song.trackId) {
    const cacheKey = String(song.trackId);
    if (streamCache.has(cacheKey)) return streamCache.get(cacheKey);

    try {
      const stream = unwrapGaana(await requestJson(gaana(`/stream/${encodeURIComponent(song.trackId)}?quality=high`)));
      const url = stream?.hlsUrl || stream?.url;
      if (typeof url === "string" && url) {
        streamCache.set(cacheKey, url);
        return url;
      }
    } catch {}
    try {
      const legacyResults = await legacyData(`/search?query=${encodeURIComponent(song.name)}`);
      const legacySong = legacyResults?.songs?.results?.[0] || legacyResults?.songs?.[0];
      const legacyUrl = legacySong?.downloadUrl?.[4]?.url || legacySong?.downloadUrl?.[0]?.url;
      if (legacyUrl) return legacyUrl;
    } catch {}
  }
  return song?.downloadUrl?.[4]?.url || song?.downloadUrl?.[0]?.url || "";
}

export async function getAlbumData(id) {
  const result = await tryProviders(
    async () => normalizeAlbum(await gaanaData(`/albums/${encodeURIComponent(id)}`)),
    async () => normalizeAlbum(await legacyData(`/albums?id=${encodeURIComponent(id)}`)),
    (value) => Boolean(value?.id && isNonEmptyArray(value?.songs))
  );
  return result || { songs: [] };
}

export async function getplaylistData(id) {
  const result = await tryProviders(
    async () => normalizePlaylist(await gaanaData(`/playlists/${encodeURIComponent(id)}`)),
    async () => normalizePlaylist(await legacyData(`/playlists?id=${encodeURIComponent(id)}&limit=50`)),
    (value) => Boolean(value?.id && isNonEmptyArray(value?.songs))
  );
  return result || { songs: [] };
}

export async function getlyricsData(id, song) {
  const result = await tryProviders(
    async () => {
      const seokey = song?.seokey || song?.id;
      if (!seokey) return null;
      const value = await gaanaData(`/lyrics/${encodeURIComponent(seokey)}`);
      return value?.lyrics?.trim() ? { success: true, data: value } : null;
    },
    async () => {
      const title = encodeURIComponent(id);
      const urls = [
        `https://lyrics.lewdhutao.my.eu.org/v2/youtube/lyrics?title=${title}`,
        `https://lyrics.lewdhutao.my.eu.org/v2/musixmatch/lyrics?title=${title}`,
      ];
      for (const url of urls) {
        try {
          const response = await requestJson(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
          const parsed = response?.contents ? JSON.parse(response.contents) : null;
          if (parsed?.data?.lyrics?.trim()) return { success: true, data: parsed.data };
        } catch {}
      }
      return null;
    },
    (value) => Boolean(value?.success && value?.data?.lyrics)
  );
  return result || { success: false };
}

export async function getArtistData(id) {
  const result = await tryProviders(
    async () => normalizeArtist(await gaanaData(`/artists/${encodeURIComponent(id)}`)),
    async () => normalizeArtist(await legacyData(`/artists?id=${encodeURIComponent(id)}`)),
    (value) => Boolean(value?.id && value?.name)
  );
  return result || {};
}

export async function getArtistSongs(id, page = 0) {
  const artist = await getArtistData(id);
  if (isNonEmptyArray(artist.songs)) return { songs: artist.songs };
  const legacyResult = await legacyData(`/artists/${encodeURIComponent(id)}/songs?page=${page}`);
  return { songs: (legacyResult?.songs || []).map((song) => normalizeSong(song, "legacy")).filter(Boolean) };
}

export async function getArtistAlbums(id, page = 0) {
  const artist = await getArtistData(id);
  if (isNonEmptyArray(artist.albums)) return { albums: artist.albums };
  const legacyResult = await legacyData(`/artists/${encodeURIComponent(id)}/albums?page=${page}`);
  return { albums: (legacyResult?.albums || []).map((album) => normalizeAlbum(album)).filter(Boolean) };
}

export async function getSearchedData(query) {
  const result = await tryProviders(
    async () => {
      return normalizeSearch(await requestJson(gaana(`/search?q=${encodeURIComponent(query)}&limit=20`)));
    },
    async () => legacyData(`/search?query=${encodeURIComponent(query)}`),
    (value) =>
      isObject(value) &&
      (isNonEmptyArray(value?.songs?.results) ||
        isNonEmptyArray(value?.albums?.results) ||
        isNonEmptyArray(value?.artists?.results) ||
        isNonEmptyArray(value?.playlists?.results))
  );
  return result || { songs: { results: [] }, albums: { results: [] }, artists: { results: [] }, playlists: { results: [] } };
}

export async function getSearchSuggestions(query) {
  const value = String(query || "").trim();
  if (!value) return [];

  const result = await tryProviders(
    async () => {
      const payload = await requestJson(
        gaana(`/search/songs?q=${encodeURIComponent(value)}&limit=5`)
      );
      return (unwrapGaana(payload) || []).map(normalizeSong).filter(Boolean).slice(0, 5);
    },
    async () => {
      const payload = await legacyData(`/search?query=${encodeURIComponent(value)}`);
      return (payload?.songs?.results || payload?.songs || [])
        .map((song) => normalizeSong(song, "legacy"))
        .filter(Boolean)
        .slice(0, 5);
    },
    isNonEmptyArray
  );

  return result || [];
}

export async function getRecommendedSongs(artistId, songId) {
  const result = await tryProviders(
    async () => [],
    async () => legacyData(`/songs/${encodeURIComponent(songId)}/suggestions`),
    isNonEmptyArray
  );
  return (result || []).map((song) => normalizeSong(song, "legacy")).filter(Boolean);
}

export async function addFavourite(id) {
  try {
    const response = await backendFetch("/api/favourite", {
      method: "POST",
      body: JSON.stringify(id),
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch {
    return null;
  }
}

export async function getFavourite() {
  try {
    const response = await backendFetch("/api/favourite");
    return (await response.json())?.data?.favourites;
  } catch {
    return [];
  }
}

export async function getUserInfo() {
  try {
    return (await (await backendFetch("/api/userInfo")).json())?.data;
  } catch {
    return null;
  }
}

export async function resetPassword(password, confirmPassword, token) {
  const response = await backendFetch("/api/forgotPassword", {
    method: "PUT",
    body: JSON.stringify({ password, confirmPassword, token }),
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}

export async function sendResetPasswordLink(email) {
  const response = await backendFetch("/api/forgotPassword", {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}
import { backendFetch } from "./backendApi";
