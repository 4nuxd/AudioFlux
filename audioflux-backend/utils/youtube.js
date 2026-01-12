const axios = require('axios');
const yts = require('yt-search');

const API_KEY = process.env.YOUTUBE_API_KEY || "your_youtube_api_key_here";
const API_URL = process.env.YOUTUBE_API_URL || "your_youtube_api_url_here";

/**
 * Search YouTube locally using yt-search library and get download links
 * This mimics VideosSearch() from Python - local scraping + API download
 * @param {string} query - Search query
 * @returns {Array} Array of song objects with direct download URLs
 */
async function searchYouTube(query) {
  try {
    console.log('[YouTube] Starting local search for:', query);

    const searchResults = await yts(query);

    if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
      console.log('[YouTube] No results found');
      return [];
    }

    console.log(`[YouTube] Found ${searchResults.videos.length} results`);

    const songsPromises = searchResults.videos.slice(0, 10).map(async (video) => {
      // Convert duration string (MM:SS) to seconds
      const durationParts = (video.timestamp || '0:00').split(':');
      let durationSeconds = 0;
      if (durationParts.length === 2) {
        durationSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
      } else if (durationParts.length === 3) {
        durationSeconds = parseInt(durationParts[0]) * 3600 + parseInt(durationParts[1]) * 60 + parseInt(durationParts[2]);
      }

      const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

      let downloadUrl = null;
      try {
        const apiResponse = await axios.get(API_URL, {
          params: {
            url: videoUrl,
            format: 'video', // Changed format from 'mp3' to 'video' to get video format from API
            download: 'True',
            api_key: API_KEY
          },
          timeout: 30000 // 30 seconds timeout per video
        });

        if (apiResponse.data && apiResponse.data.status === 'success' && apiResponse.data.url) {
          downloadUrl = apiResponse.data.url;
          console.log(`[YouTube] Got download URL for: ${video.title}`);
        } else {
          console.log(`[YouTube] No download URL for: ${video.title}`);
          return null; // Return null if no download URL
        }
      } catch (apiError) {
        console.error(`[YouTube] Failed to get download URL for ${video.videoId}:`, apiError.message);
        return null; // Return null if API call failed
      }

      return {
        id: video.videoId,
        title: video.title || 'Unknown Title',
        artists: [video.author?.name || 'Unknown Artist'], // Return as array for consistency
        duration: durationSeconds,
        thumbnail: video.thumbnail || video.image || '',
        source: 'youtube',
        videoId: video.videoId,
        url: videoUrl,
        downloadUrl: downloadUrl // Direct download link like JioSaavn
      };
    });

    const songs = await Promise.all(songsPromises);
    const validSongs = songs.filter(song => song !== null);
    console.log(`[YouTube] Processed ${validSongs.length} songs with valid download URLs`);
    return validSongs;
  } catch (error) {
    console.error('[YouTube] Local search error:', error.message);
    return [];
  }
}

/**
 * Get YouTube video stream URL using custom API
 * This is called when we need to play/download the video
 * @param {string} videoId - YouTube video ID or URL
 * @returns {Object} Stream info object
 */
async function getYouTubeStream(videoId) {
  try {
    console.log('[YouTube API] Getting stream URL for videoId:', videoId);

    const response = await axios.get(API_URL, {
      params: {
        id: videoId,
        key: API_KEY
      },
      timeout: 150000 // 150 seconds timeout
    });

    if (response.data && response.data.url) {
      console.log('[YouTube API] Stream URL obtained successfully');
      return {
        success: true,
        url: response.data.url,
        title: response.data.title || 'Unknown'
      };
    } else {
      console.log('[YouTube API] No stream URL in response');
      return {
        success: false,
        message: 'Failed to fetch stream URL from API'
      };
    }
  } catch (error) {
    console.error('[YouTube API] Error:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  searchYouTube,
  getYouTubeStream
};
