const axios = require('axios');
const youtubeService = require('./youtubeService');
const logger = require('../logger');

class SpotifyService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get Spotify access token (client credentials flow)
     */
    async getAccessToken() {
        // Check if token is still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const clientId = process.env.SPOTIFY_CLIENT_ID;
            const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                throw new Error('Spotify credentials not configured');
            }

            const response = await axios.post(
                'https://accounts.spotify.com/api/token',
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            return this.accessToken;
        } catch (error) {
            console.error('[SpotifyService] Error getting access token:', error.message);
            throw error;
        }
    }

    /**
     * Extract track info from Spotify URL or URI
     * @param {string} input - Spotify URL or URI
     * @returns {Promise<Object>}
     */
    async getTrackInfo(input) {
        try {
            const trackId = this.extractTrackId(input);
            if (!trackId) {
                throw new Error('Invalid Spotify URL or URI');
            }

            const token = await this.getAccessToken();

            const response = await axios.get(
                `https://api.spotify.com/v1/tracks/${trackId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const track = response.data;

            return {
                id: track.id,
                title: track.name,
                artists: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                thumbnail: track.album.images[0]?.url || null,
                duration: Math.floor(track.duration_ms / 1000),
                spotifyUrl: track.external_urls.spotify,
                source: 'spotify'
            };
        } catch (error) {
            console.error('[SpotifyService] Error getting track info:', error.message);
            throw error;
        }
    }

    /**
     * Search Spotify for tracks
     * @param {string} query - Search query
     * @returns {Promise<Array>}
     */
    async search(query) {
        try {
            const token = await this.getAccessToken();

            const response = await axios.get(
                'https://api.spotify.com/v1/search',
                {
                    params: {
                        q: query,
                        type: 'track',
                        limit: 10
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return response.data.tracks.items.map(track => ({
                id: track.id,
                title: track.name,
                artists: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                thumbnail: track.album.images[0]?.url || null,
                duration: Math.floor(track.duration_ms / 1000),
                spotifyUrl: track.external_urls.spotify,
                source: 'spotify'
            }));
        } catch (error) {
            console.error('[SpotifyService] Search error:', error.message);
            return [];
        }
    }

    /**
     * Convert Spotify track to YouTube download
     * Gets metadata from Spotify, searches YouTube, downloads as MP4
     * @param {string} spotifyUrl - Spotify track URL
     * @returns {Promise<Object>}
     */
    async convertToYouTube(spotifyUrl) {
        try {
            console.log('[SpotifyService] Converting Spotify to YouTube:', spotifyUrl);

            // 1. Get Spotify track metadata
            const trackInfo = await this.getTrackInfo(spotifyUrl);
            console.log('[SpotifyService] Track info:', trackInfo.title, 'by', trackInfo.artists);

            // 2. Search YouTube for the track
            const searchQuery = `${trackInfo.title} ${trackInfo.artists}`;
            const youtubeResults = await youtubeService.search(searchQuery);

            if (youtubeResults.length === 0) {
                throw new Error('No YouTube results found for this track');
            }

            // 3. Get the best match (first result)
            const bestMatch = youtubeResults[0];
            console.log('[SpotifyService] Best YouTube match:', bestMatch.title);

            // 4. Download the YouTube video as MP4
            const downloadInfo = await youtubeService.downloadVideo(bestMatch.url);

            // 5. Return combined info (Spotify metadata + YouTube download URL)
            return {
                id: trackInfo.id,
                title: trackInfo.title,
                artists: trackInfo.artists,
                album: trackInfo.album,
                thumbnail: trackInfo.thumbnail, // Use Spotify thumbnail (better quality)
                duration: trackInfo.duration,
                downloadUrl: downloadInfo.downloadUrl,
                source: 'spotify',
                youtubeId: downloadInfo.videoId,
                spotifyUrl: trackInfo.spotifyUrl
            };
        } catch (error) {
            console.error('[SpotifyService] Error converting to YouTube:', error.message);
            logger.error('spotify_convert_error', {
                spotifyUrl,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Extract track ID from Spotify URL or URI
     * @param {string} input - Spotify URL or URI
     * @returns {string|null}
     */
    extractTrackId(input) {
        const patterns = [
            /spotify\.com\/track\/([a-zA-Z0-9]+)/,
            /spotify:track:([a-zA-Z0-9]+)/
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Check if input is a Spotify URL or URI
     * @param {string} input
     * @returns {boolean}
     */
    isSpotifyUrl(input) {
        return /spotify\.com\/track\/|spotify:track:/.test(input);
    }
}

module.exports = new SpotifyService();
