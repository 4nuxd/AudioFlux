const {
    getUserStats,
    likeSong,
    unlikeSong,
    getLikedSongs,
    isLiked,
    incrementSongsAdded,
    addListeningSession
} = require('../redis');
const logger = require('../logger');

class UserService {
    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        try {
            const stats = await getUserStats(userId);
            logger.info('user_stats_fetched', { userId });
            return stats;
        } catch (error) {
            console.error('[UserService] Error getting user stats:', error);
            logger.error('user_stats_error', { error: error.message, userId });
            throw error;
        }
    }

    /**
     * Like a song
     */
    async likeSong(userId, song) {
        try {
            await likeSong(userId, song);
            logger.info('song_liked', { userId, songId: song.id });
            return { success: true };
        } catch (error) {
            console.error('[UserService] Error liking song:', error);
            logger.error('like_song_error', { error: error.message, userId });
            throw error;
        }
    }

    /**
     * Unlike a song
     */
    async unlikeSong(userId, songId) {
        try {
            await unlikeSong(userId, songId);
            logger.info('song_unliked', { userId, songId });
            return { success: true };
        } catch (error) {
            console.error('[UserService] Error unliking song:', error);
            logger.error('unlike_song_error', { error: error.message, userId });
            throw error;
        }
    }

    /**
     * Get user's liked songs
     */
    async getLikedSongs(userId) {
        try {
            const likedSongs = await getLikedSongs(userId);
            logger.info('liked_songs_fetched', { userId, count: likedSongs.length });
            return likedSongs;
        } catch (error) {
            console.error('[UserService] Error getting liked songs:', error);
            logger.error('get_liked_songs_error', { error: error.message, userId });
            throw error;
        }
    }

    /**
     * Check if song is liked
     */
    async isLiked(userId, songId) {
        try {
            return await isLiked(userId, songId);
        } catch (error) {
            console.error('[UserService] Error checking if liked:', error);
            return false;
        }
    }

    /**
     * Increment songs added counter
     */
    async incrementSongsAdded(userId) {
        try {
            await incrementSongsAdded(userId);
        } catch (error) {
            console.error('[UserService] Error incrementing songs added:', error);
        }
    }

    /**
     * Add listening session
     */
    async addListeningSession(userId, minutes) {
        try {
            await addListeningSession(userId, minutes);
            logger.info('listening_session_added', { userId, minutes });
        } catch (error) {
            console.error('[UserService] Error adding listening session:', error);
        }
    }
}

module.exports = new UserService();
