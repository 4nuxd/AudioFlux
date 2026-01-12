const axios = require('axios');
const logger = require('../logger');

const YOUTUBE_API_BASE = process.env.YOUTUBE_API_BASE || 'your_youtube_api_base_url_here';
const API_KEY = process.env.YOUTUBE_API_KEY || 'your_youtube_api_key_here';

class YouTubeService {
    /**
     * Download YouTube video as MP4 (for audio playback)
     * @param {string} url - YouTube URL
     * @returns {Promise<{downloadUrl: string, videoId: string}>}
     */
    async downloadVideo(url) {
        try {
            console.log('[YouTubeService] Downloading video:', url);

            // Extract video ID from URL
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }

            // Call YouTube API to get download URL
            const response = await axios.get(`${YOUTUBE_API_BASE}/api/youtube`, {
                params: {
                    url: url,
                    format: 'video', // Use video format for MP4
                    download: 'True',
                    api_key: API_KEY
                },
                timeout: 30000 // 30 second timeout
            });

            if (!response.data || !response.data.url) {
                throw new Error('Failed to get download URL from API');
            }

            const rawUrl = response.data.url;
            console.log('[YouTubeService] Got raw URL from API:', rawUrl);

            // Download the video to temp folder
            const fs = require('fs');
            const path = require('path');
            const tempDir = '/tmp/youtube-videos';

            // Create temp directory if it doesn't exist
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Generate filename
            const filename = `${videoId}_${Date.now()}.mp4`;
            const filepath = path.join(tempDir, filename);

            console.log('[YouTubeService] Downloading to:', filepath);

            // Download the video file
            const videoResponse = await axios({
                method: 'GET',
                url: rawUrl,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filepath);
            videoResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log('[YouTubeService] Download complete:', filepath);

            // Return URL to access the downloaded file
            const backendUrl = process.env.BACKEND_URL || 'your_backend_url_here';
            const downloadUrl = `${backendUrl}/api/proxy/youtube-file/${filename}`;

            console.log('[YouTubeService] File URL:', downloadUrl);

            return {
                downloadUrl,
                videoId,
                duration: response.data.duration_secs || response.data.duration || 0,
                title: response.data.title || 'Unknown',
                localPath: filepath
            };
        } catch (error) {
            console.error('[YouTubeService] Error downloading video:', error.message);
            logger.error('youtube_download_error', {
                url,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Search YouTube for a query
     * @param {string} query - Search query
     * @returns {Promise<Array>}
     */
    async search(query) {
        try {
            console.log('[YouTubeService] Searching YouTube:', query);

            // Use yt-search for finding videos
            const yts = require('yt-search');
            const searchResults = await yts(query);

            if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
                console.log('[YouTubeService] No results found');
                return [];
            }

            console.log(`[YouTubeService] Found ${searchResults.videos.length} results`);

            // Get download URLs for top 5 results (don't download yet, just get URLs)
            const songsPromises = searchResults.videos.slice(0, 5).map(async (video) => {
                // Convert duration string (MM:SS) to seconds
                const durationParts = (video.timestamp || '0:00').split(':');
                let durationSeconds = 0;
                if (durationParts.length === 2) {
                    durationSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
                } else if (durationParts.length === 3) {
                    durationSeconds = parseInt(durationParts[0]) * 3600 + parseInt(durationParts[1]) * 60 + parseInt(durationParts[2]);
                }

                const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

                // Don't download during search - just return video info
                // Download will happen when song is actually played
                return {
                    id: video.videoId,
                    title: video.title || 'Unknown Title',
                    artists: [video.author?.name || 'Unknown Artist'],
                    duration: durationSeconds,
                    thumbnail: video.thumbnail || video.image || '',
                    source: 'youtube',
                    url: videoUrl,
                    downloadUrl: null, // Will be set when song is played
                    needsDownload: true // Flag to download when played
                };
            });

            const songs = await Promise.all(songsPromises);
            const validSongs = songs.filter(song => song !== null);
            console.log(`[YouTubeService] Processed ${validSongs.length} songs with valid download URLs`);
            return validSongs;
        } catch (error) {
            console.error('[YouTubeService] Search error:', error.message);
            return [];
        }
    }

    /**
     * Extract video ID from YouTube URL
     * @param {string} url - YouTube URL
     * @returns {string|null}
     */
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Get video info without downloading
     * @param {string} url - YouTube URL
     * @returns {Promise<Object>}
     */
    async getVideoInfo(url) {
        try {
            const response = await axios.get(`${YOUTUBE_API_BASE}/api/youtube/info`, {
                params: {
                    url: url,
                    api_key: API_KEY
                },
                timeout: 10000
            });

            return {
                title: response.data.title,
                duration: response.data.duration,
                thumbnail: response.data.thumbnail,
                videoId: this.extractVideoId(url)
            };
        } catch (error) {
            console.error('[YouTubeService] Error getting video info:', error.message);
            throw error;
        }
    }
}

module.exports = new YouTubeService();
