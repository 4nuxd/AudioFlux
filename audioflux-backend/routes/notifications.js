const express = require('express');
const router = express.Router();
const { client } = require('../redis');

// GET /api/notifications - Fetch all notifications
router.get('/', async (req, res) => {
    try {
        const notificationsKey = 'global:notifications';
        const notifications = await client.get(notificationsKey);

        if (!notifications) {
            return res.json({ success: true, notifications: [] });
        }

        const parsedNotifications = JSON.parse(notifications);
        res.json({ success: true, notifications: parsedNotifications });
    } catch (error) {
        console.error('[API] Error fetching notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
});

module.exports = router;
