const {
    getQueue, setQueue, addSong, removeSong, clearQueue,
    getState, setState, addVote, getVotes, resetVotes,
    addViewer, removeViewer, getViewers, extendTTL,
    setLoopMode, getLoopMode
} = require('../redis');
const logger = require('../logger');

class QueueService {
    /**
     * Get queue for a room
     */
    async getQueue(roomId) {
        try {
            return await getQueue(roomId) || [];
        } catch (error) {
            console.error('[QueueService] Error getting queue:', error);
            logger.error('queue_get_error', { error: error.message, roomId });
            return [];
        }
    }

    /**
     * Set queue for a room
     */
    async setQueue(roomId, queue) {
        try {
            await setQueue(roomId, queue);
            logger.info('queue_updated', { roomId, queueLength: queue.length });
        } catch (error) {
            console.error('[QueueService] Error setting queue:', error);
            logger.error('queue_set_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Add song to queue
     */
    async addSong(roomId, song, user) {
        try {
            // For auto-play songs, don't set addedBy - let frontend show "Auto-Play"
            // For user-added songs, set addedBy to user or default to Unknown
            const songWithUser = {
                ...song,
                addedBy: song.isAutoPlay ? undefined : (song.addedBy || user || { name: 'Unknown' })
            };

            await addSong(roomId, songWithUser);
            const queue = await getQueue(roomId) || [];

            logger.info('song_added_to_queue', {
                roomId,
                songId: song.id,
                userId: user?.id || song.addedBy?.id,
                isAutoPlay: song.isAutoPlay || false
            });

            return queue;
        } catch (error) {
            console.error('[QueueService] Error adding song:', error);
            logger.error('queue_add_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Remove song from queue
     */
    async removeSong(roomId, songId) {
        try {
            await removeSong(roomId, songId);
            const queue = await getQueue(roomId) || [];

            logger.info('song_removed_from_queue', { roomId, songId });

            return queue;
        } catch (error) {
            console.error('[QueueService] Error removing song:', error);
            logger.error('queue_remove_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Clear queue
     */
    async clearQueue(roomId) {
        try {
            await clearQueue(roomId);
            logger.info('queue_cleared', { roomId });
            return [];
        } catch (error) {
            console.error('[QueueService] Error clearing queue:', error);
            logger.error('queue_clear_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Get playback state
     */
    async getState(roomId) {
        try {
            return await getState(roomId) || {};
        } catch (error) {
            console.error('[QueueService] Error getting state:', error);
            logger.error('state_get_error', { error: error.message, roomId });
            return {};
        }
    }

    /**
     * Set playback state
     */
    async setState(roomId, state) {
        try {
            await setState(roomId, state);
            logger.info('state_updated', { roomId });
        } catch (error) {
            console.error('[QueueService] Error setting state:', error);
            logger.error('state_set_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Get viewers in a room
     */
    async getViewers(roomId) {
        try {
            return await getViewers(roomId) || [];
        } catch (error) {
            console.error('[QueueService] Error getting viewers:', error);
            logger.error('viewers_get_error', { error: error.message, roomId });
            return [];
        }
    }

    /**
     * Add viewer to room
     */
    async addViewer(roomId, user) {
        try {
            // Redis addViewer expects (groupId, viewerId, userProfile)
            await addViewer(roomId, user.id, user);
            logger.info('viewer_added', { roomId, userId: user.id });
        } catch (error) {
            console.error('[QueueService] Error adding viewer:', error);
            logger.error('viewer_add_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Remove viewer from room
     */
    async removeViewer(roomId, userId) {
        try {
            await removeViewer(roomId, userId);
            logger.info('viewer_removed', { roomId, userId });
        } catch (error) {
            console.error('[QueueService] Error removing viewer:', error);
            logger.error('viewer_remove_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Get loop mode for a room
     */
    async getLoopMode(roomId) {
        try {
            return await getLoopMode(roomId);
        } catch (error) {
            console.error('[QueueService] Error getting loop mode:', error);
            logger.error('loop_get_error', { error: error.message, roomId });
            return 'none';
        }
    }

    /**
     * Set loop mode for a room
     */
    async setLoopMode(roomId, mode) {
        try {
            await setLoopMode(roomId, mode);
            logger.info('loop_mode_set', { roomId, mode });
        } catch (error) {
            logger.error('loop_set_error', { error: error.message, roomId });
            throw error;
        }
    }

    /**
     * Calculate current playback time
     */
    getCurrentPlaybackTime(state) {
        if (!state.playing || !state.songStartedAt) {
            return state.currentTime || 0;
        }

        // Calculate how much time has passed since song started
        const elapsed = Date.now() - state.songStartedAt;
        let currentPosition = (state.currentTime || 0) + (elapsed / 1000);

        // Don't exceed song duration
        if (state.currentSong && state.currentSong.duration) {
            currentPosition = Math.min(currentPosition, state.currentSong.duration);
        }

        return currentPosition;
    }

    /**
     * Get song history for a room (for previous functionality)
     */
    async getSongHistory(roomId) {
        try {
            const { client } = require('../redis');
            const history = await client.get(`history:${roomId}`);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('[QueueService] Error getting song history:', error);
            return [];
        }
    }

    /**
     * Add song to history
     */
    async addToHistory(roomId, song) {
        try {
            const { client } = require('../redis');
            const history = await this.getSongHistory(roomId);

            // Keep last 10 songs in history
            history.unshift(song);
            if (history.length > 10) {
                history.pop();
            }

            await client.set(`history:${roomId}`, JSON.stringify(history), 'EX', 3600); // 1 hour TTL
            logger.info('song_added_to_history', { roomId, songId: song.id });
        } catch (error) {
            console.error('[QueueService] Error adding to history:', error);
        }
    }

    /**
     * Go to previous song
     */
    async previousSong(roomId) {
        try {
            const history = await this.getSongHistory(roomId);

            if (history.length === 0) {
                return null; // No previous song
            }

            // Get the most recent song from history
            const previousSong = history.shift();

            // Update history
            const { client } = require('../redis');
            await client.set(`history:${roomId}`, JSON.stringify(history), 'EX', 3600);

            // Add it back to the front of the queue
            const queue = await getQueue(roomId) || [];
            queue.unshift(previousSong);
            await setQueue(roomId, queue);

            logger.info('previous_song_restored', { roomId, songId: previousSong.id });

            return previousSong;
        } catch (error) {
            console.error('[QueueService] Error going to previous song:', error);
            logger.error('previous_song_error', { error: error.message, roomId });
            throw error;
        }
    }
}

module.exports = new QueueService();
