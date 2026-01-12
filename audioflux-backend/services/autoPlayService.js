/**
 * Auto-Play Service
 * Manages automatic song suggestions and queuing based on listening history
 */

const axios = require('axios');
const { client } = require('../redis');
const logger = require('../logger');

class AutoPlayService {
    constructor() {
        this.API_URL = process.env.API_URL || 'your_jiosaavn_api_url_here';
    }

    /**
     * Get auto-play state for a room
     */
    async getAutoPlayState(roomId) {
        try {
            const state = await client.get(`autoplay:${roomId}`);
            return state ? JSON.parse(state) : { enabled: false, lastSongId: null };
        } catch (error) {
            console.error('[AutoPlay] Error getting state:', error);
            return { enabled: false, lastSongId: null };
        }
    }

    /**
     * Set auto-play state for a room
     */
    async setAutoPlayState(roomId, enabled, lastSongId = null) {
        try {
            const state = { enabled, lastSongId };
            await client.set(`autoplay:${roomId}`, JSON.stringify(state), 'EX', 86400); // 24 hours
            logger.info('autoplay_state_updated', { roomId, enabled, lastSongId });
            return state;
        } catch (error) {
            console.error('[AutoPlay] Error setting state:', error);
            throw error;
        }
    }

    /**
     * Toggle auto-play for a room
     */
    async toggleAutoPlay(roomId) {
        try {
            const currentState = await this.getAutoPlayState(roomId);
            const newEnabled = !currentState.enabled;
            return await this.setAutoPlayState(roomId, newEnabled, currentState.lastSongId);
        } catch (error) {
            console.error('[AutoPlay] Error toggling:', error);
            throw error;
        }
    }

    /**
     * Fetch song suggestions from JioSaavn API
     */
    async fetchSuggestions(songId, limit = 10) {
        try {
            const url = `${this.API_URL}songs/${songId}/suggestions?limit=${limit}`;
            console.log('[AutoPlay] Fetching suggestions from:', url);

            const response = await axios.get(url, { timeout: 10000 });

            if (response.data && response.data.data) {
                const suggestions = response.data.data
                    .map(song => {
                        // Get the best quality download URL available
                        const downloadUrl = song.downloadUrl?.[4]?.url ||
                            song.downloadUrl?.[3]?.url ||
                            song.downloadUrl?.[2]?.url ||
                            song.downloadUrl?.[1]?.url ||
                            song.downloadUrl?.[0]?.url;

                        return {
                            id: song.id,
                            title: song.name,
                            artists: song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown',
                            duration: song.duration,
                            thumbnail: song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url,
                            downloadUrl: downloadUrl,
                            source: 'saavn',
                            isAutoPlay: true // Mark as auto-play song
                        };
                    })
                    // Filter out songs without valid download URLs
                    .filter(song => {
                        if (!song.downloadUrl) {
                            console.log(`[AutoPlay] Skipping "${song.title}" - no download URL`);
                            return false;
                        }
                        return true;
                    });

                console.log(`[AutoPlay] Fetched ${suggestions.length} valid suggestions (filtered from ${response.data.data.length})`);

                logger.info('autoplay_suggestions_fetched', {
                    songId,
                    count: suggestions.length,
                    totalFetched: response.data.data.length
                });

                return suggestions;
            }

            return [];
        } catch (error) {
            console.error('[AutoPlay] Error fetching suggestions:', error.message);
            logger.error('autoplay_fetch_error', {
                error: error.message,
                songId
            });
            return [];
        }
    }

    /**
     * Get next auto-play song
     * Returns null if auto-play is disabled or no suggestions available
     */
    async getNextAutoPlaySong(roomId, lastPlayedSongId) {
        try {
            const state = await this.getAutoPlayState(roomId);

            if (!state.enabled) {
                console.log('[AutoPlay] Auto-play is disabled for room:', roomId);
                return null;
            }

            // Use the last played song ID to get suggestions
            const songIdToUse = lastPlayedSongId || state.lastSongId;

            if (!songIdToUse) {
                console.log('[AutoPlay] No song ID available for suggestions');
                return null;
            }

            // Fetch suggestions
            const suggestions = await this.fetchSuggestions(songIdToUse, 10);

            if (suggestions.length === 0) {
                console.log('[AutoPlay] No suggestions available');
                return null;
            }

            // Get a random suggestion from the list
            const randomIndex = Math.floor(Math.random() * Math.min(5, suggestions.length));
            const selectedSong = suggestions[randomIndex];

            // Update last song ID
            await this.setAutoPlayState(roomId, true, songIdToUse);

            console.log('[AutoPlay] Selected song:', selectedSong.title);
            return selectedSong;
        } catch (error) {
            console.error('[AutoPlay] Error getting next song:', error);
            return null;
        }
    }

    /**
     * Update last played song ID for future suggestions
     */
    async updateLastPlayedSong(roomId, songId) {
        try {
            const state = await this.getAutoPlayState(roomId);
            await this.setAutoPlayState(roomId, state.enabled, songId);
            console.log('[AutoPlay] Updated last played song:', songId);
        } catch (error) {
            console.error('[AutoPlay] Error updating last song:', error);
        }
    }
}

module.exports = new AutoPlayService();
