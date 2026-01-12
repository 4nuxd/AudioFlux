/**
 * Winter Mode API
 * Toggle Winter theme on/off from server
 */

const express = require('express');
const router = express.Router();

// In-memory storage (use Redis in production)
let winterModeEnabled = true; // Default: enabled

/**
 * GET /api/winter-mode
 * Get current Winter mode status
 */
router.get('/', (req, res) => {
    res.json({
        enabled: winterModeEnabled,
        message: winterModeEnabled ? 'Winter mode is ON! ❄️' : 'Winter mode is OFF'
    });
});

/**
 * POST /api/winter-mode
 * Toggle Winter mode (owner only)
 */
router.post('/', (req, res) => {
    const { userId, token } = req.query;
    const OWNER_ID = process.env.OWNER_ID;
    const BOT_TOKEN = process.env.BOT_TOKEN;

    // Check authentication
    if (!userId || userId !== OWNER_ID || !token || token !== BOT_TOKEN) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Owner authentication required'
        });
    }

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'enabled must be a boolean'
        });
    }

    winterModeEnabled = enabled;

    res.json({
        success: true,
        enabled: winterModeEnabled,
        message: `Winter mode ${winterModeEnabled ? 'enabled' : 'disabled'}! ${winterModeEnabled ? '❄️🌨️⛄' : ''}`
    });
});

module.exports = router;

