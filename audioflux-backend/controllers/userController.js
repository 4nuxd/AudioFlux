const userService = require('../services/userService');
const logger = require('../logger');

class UserController {
    /**
     * Get user statistics
     */
    async getUserStats(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ success: false, error: 'userId required' });
            }

            const stats = await userService.getUserStats(userId);

            res.json({ success: true, stats });
        } catch (error) {
            console.error('[UserController] Get user stats error:', error);
            logger.error('user_stats_error', { error: error.message, userId: req.params.userId });
            res.status(500).json({ success: false, error: 'Failed to fetch user statistics' });
        }
    }

    // Liked songs methods removed - use playlist feature instead
}

module.exports = new UserController();
