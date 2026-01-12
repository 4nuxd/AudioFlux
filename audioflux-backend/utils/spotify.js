const axios = require('axios');

/**
 * Spotify Search Integration
 * Uses Spotify Web API to search for tracks
 */

class SpotifyService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.clientId = process.env.SPOTIFY_CLIENT_ID;
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    }

    /**
     * Get Spotify access token using Client Credentials flow
     */
    async getAccessToken() {
        try {
            // Return cached token if still valid
            if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return this.accessToken;
            }

            if (!this.clientId || !this.clientSecret) {
                console.warn('[Spotify] Missing credentials, skipping Spotify search');
                return null;
            }

            const response = await axios.post(
                'https://accounts.spotify.com/api/token',
                'grant_type=client_credentials',
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry to 5 minutes before actual expiry for safety
            this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);

            console.log('[Spotify] Access token obtained successfully');
            return this.accessToken;

        } catch (error) {
            console.error('[Spotify] Failed to get access token:', error.message);
            return null;
        }
    }

    /**
     * Search Spotify for tracks
     * @param {string} query - Search query
     * @param {number} limit - Number of results (default: 10)
     */
    async searchTracks(query, limit = 10) {
        try {
            const token = await this.getAccessToken();
            if (!token) {
                console.log('[Spotify] No access token, returning empty results');
                return [];
            }

            console.log('[Spotify] Searching for:', query);

            const response = await axios.get('https://api.spotify.com/v1/search', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    q: query,
                    type: 'track',
                    limit: limit,
                    market: 'IN' // Indian market
                }
            });

            const tracks = response.data.tracks.items;
            console.log(`[Spotify] Found ${tracks.length} tracks`);

            // Transform Spotify tracks to our format
            const songs = tracks.map(track => ({
                id: track.id,
                title: track.name,
                artists: track.artists.map(artist => artist.name),
                duration: Math.floor(track.duration_ms / 1000),
                thumbnail: track.album.images[0]?.url || '',
                source: 'spotify',
                spotifyUrl: track.external_urls.spotify,
                previewUrl: track.preview_url, // 30-second preview
                album: track.album.name,
                releaseDate: track.album.release_date,
                // Note: Spotify doesn't provide full download URLs
                // We'll need to use JioSaavn for actual playback
                downloadUrl: null
            }));

            return songs;

        } catch (error) {
            console.error('[Spotify] Search error:', error.message);
            return [];
        }
    }

    /**
     * Get track details by Spotify ID
     */
    async getTrack(trackId) {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

            const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const track = response.data;

            return {
                id: track.id,
                title: track.name,
                artists: track.artists.map(artist => artist.name),
                duration: Math.floor(track.duration_ms / 1000),
                thumbnail: track.album.images[0]?.url || '',
                source: 'spotify',
                spotifyUrl: track.external_urls.spotify,
                previewUrl: track.preview_url,
                album: track.album.name,
                releaseDate: track.album.release_date,
                downloadUrl: null
            };

        } catch (error) {
            console.error('[Spotify] Get track error:', error.message);
            return null;
        }
    }
}

module.exports = new SpotifyService();
