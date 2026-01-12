const axios = require("axios");

const API_URL = (process.env.API_URL || "").replace(/\/$/, "");

async function searchSongs(query) {
  try {
    const url = `${API_URL}/search/songs?query=${encodeURIComponent(query)}`;

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 12000
    });

    // Handle multiple response formats
    let results =
      data?.data?.results ||
      data?.data ||
      data?.results ||
      [];

    if (Array.isArray(data?.data) && results.length === 0) {
      results = data.data;
    }

    if (!Array.isArray(results)) {
      console.error("⚠ searchSongs: results is not array, got:", typeof results);
      return [];
    }

    return results.map((s) => {
      const id = s.id || s.songid || s._id;
      const title = s.name || s.title || "Unknown Title";

      let artists = [];
      if (s.artists?.primary) {
        artists = s.artists.primary.map((a) => a.name);
      } else if (Array.isArray(s.primaryArtists)) {
        artists = s.primaryArtists;
      } else if (typeof s.primaryArtists === "string") {
        artists = s.primaryArtists.split(",").map((x) => x.trim());
      }
      
      // Ensure we always have an array
      if (!Array.isArray(artists) || artists.length === 0) {
        artists = ['Unknown'];
      }

      let duration = s.duration || s.more_info?.duration || 0;
      if (typeof duration === "string" && duration.includes(":")) {
        const [m, sec] = duration.split(":").map(Number);
        duration = m * 60 + sec;
      }
      duration = Number(duration) || 180;

      // Get highest quality thumbnail
      let thumb =
        s.image?.[2]?.url ||
        s.image?.[1]?.url ||
        s.image?.[0]?.url ||
        s.image ||
        s.thumbnail ||
        null;

      // Get highest quality download URL (320kbps preferred)
      let downloadUrl = null;
      if (Array.isArray(s.downloadUrl)) {
        // Try to find 320kbps, then 160kbps, then any available
        const quality320 = s.downloadUrl.find(d => d.quality === '320kbps');
        const quality160 = s.downloadUrl.find(d => d.quality === '160kbps');
        const anyQuality = s.downloadUrl[s.downloadUrl.length - 1];
        downloadUrl = quality320?.url || quality160?.url || anyQuality?.url || null;
      }

      return {
        id,
        title,
        artists: artists, // Return as array, not string
        duration,
        thumbnail: thumb,
        source: 'saavn',
        url: s.url || `https://www.jiosaavn.com/song/${id}`,
        downloadUrl
      };
    });
  } catch (err) {
    console.error("searchSongs ERROR:", err.message);
    return [];
  }
}

async function fetchSongById(id) {
  try {
    const url = `${API_URL}/songs?id=${encodeURIComponent(id)}`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const s =
      data?.data?.[0] ||
      data?.song ||
      data?.result ||
      null;

    if (!s) return null;

    return s;
  } catch (err) {
    console.error("fetchSongById ERROR:", err.message);
    return null;
  }
}

module.exports = { searchSongs, fetchSongById };
