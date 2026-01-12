const express = require('express');
const router = express.Router();
const { getUserStats } = require('../redis');

/**
 * GET /api/stats/:userId
 * Get user statistics (songs added, minutes listened, rooms joined)
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const stats = await getUserStats(userId);

        res.json({
            success: true,
            userId,
            stats: {
                songsAdded: stats.songsAdded || 0,
                minutesListened: stats.minutesListened || 0,
                roomsJoined: stats.roomsJoined || 0
            }
        });
    } catch (error) {
        console.error('[Stats API] Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics'
        });
    }
});

module.exports = router;
