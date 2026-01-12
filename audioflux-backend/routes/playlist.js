const express = require('express');
const router = express.Router();
const { addToPlaylist, removeFromPlaylist, getPlaylist, isInPlaylist } = require('../redis');
const logger = require('../logger');

/**
 * GET /api/playlist/:userId
 * Get user's playlist
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const playlist = await getPlaylist(userId);

        res.json({
            success: true,
            playlist: playlist || []
        });
    } catch (error) {
        console.error('[Playlist API] Error getting playlist:', error);
        logger.error('playlist_get_error', { error: error.message });
        res.status(500).json({ error: 'Failed to get playlist' });
    }
});

/**
 * POST /api/playlist
 * Add song to playlist
 */
router.post('/', async (req, res) => {
    try {
        const { userId, song } = req.body;

        if (!userId || !song) {
            return res.status(400).json({ error: 'userId and song are required' });
        }

        const added = await addToPlaylist(userId, song);

        if (!added) {
            return res.json({
                success: false,
                message: 'Song already in playlist'
            });
        }

        logger.info('song_added_to_playlist', { userId, songId: song.id });

        res.json({
            success: true,
            message: 'Song added to playlist'
        });
    } catch (error) {
        console.error('[Playlist API] Error adding to playlist:', error);
        logger.error('playlist_add_error', { error: error.message });
        res.status(500).json({ error: 'Failed to add to playlist' });
    }
});

/**
 * DELETE /api/playlist
 * Remove song from playlist
 */
router.delete('/', async (req, res) => {
    try {
        const { userId, songId } = req.body;

        if (!userId || !songId) {
            return res.status(400).json({ error: 'userId and songId are required' });
        }

        const removed = await removeFromPlaylist(userId, songId);

        if (!removed) {
            return res.json({
                success: false,
                message: 'Song not in playlist'
            });
        }

        logger.info('song_removed_from_playlist', { userId, songId });

        res.json({
            success: true,
            message: 'Song removed from playlist'
        });
    } catch (error) {
        console.error('[Playlist API] Error removing from playlist:', error);
        logger.error('playlist_remove_error', { error: error.message });
        res.status(500).json({ error: 'Failed to remove from playlist' });
    }
});

/**
 * GET /api/playlist/check/:userId/:songId
 * Check if song is in playlist
 */
router.get('/check/:userId/:songId', async (req, res) => {
    try {
        const { userId, songId } = req.params;

        if (!userId || !songId) {
            return res.status(400).json({ error: 'userId and songId are required' });
        }

        const inPlaylist = await isInPlaylist(userId, songId);

        res.json({
            success: true,
            inPlaylist
        });
    } catch (error) {
        console.error('[Playlist API] Error checking playlist:', error);
        logger.error('playlist_check_error', { error: error.message });
        res.status(500).json({ error: 'Failed to check playlist' });
    }
});

module.exports = router;
