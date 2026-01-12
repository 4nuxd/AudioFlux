const telegramService = require('../services/telegramService');
const logger = require('../logger');

class ValidationController {
    /**
     * Validate user from Telegram WebApp
     */
    async validateUser(req, res) {
        try {
            const { initData, roomId, platform } = req.body;

            if (!initData || !roomId) {
                return res.status(400).json({ error: 'initData and roomId required' });
            }

            // Parse Telegram initData (simplified - in production, verify signature)
            const params = new URLSearchParams(initData);
            const userJson = params.get('user');

            if (!userJson) {
                return res.status(400).json({ error: 'Invalid initData' });
            }

            const user = JSON.parse(userJson);

            // Check if user is member of the group
            try {
                const bot = telegramService.getBot();
                const member = await bot.telegram.getChatMember(roomId, user.id);
                const validStatuses = ['creator', 'administrator', 'member'];

                if (!member || !validStatuses.includes(member.status)) {
                    return res.status(403).json({ error: 'User not a member of this group' });
                }
            } catch (e) {
                return res.status(403).json({ error: 'Cannot verify group membership' });
            }

            // Get user profile photo
            const photoUrl = await telegramService.getUserProfilePhoto(user.id);

            const validatedUser = {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                photoUrl
            };

            logger.info('user_validated_webapp', { userId: user.id, roomId, platform });

            res.json({ user: validatedUser });
        } catch (error) {
            console.error('[ValidationController] validateUser error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Send group notification
     */
    async sendGroupNotification(req, res) {
        try {
            const { roomId, action, data } = req.body;

            if (!roomId || !action) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            let message = '';

            switch (action) {
                case 'addSong':
                    message = `➕ *Song Added from Web Player*\n\n🎵 ${data.song}\n🎤 ${data.artists}\n👤 Added by: ${data.user}`;
                    break;
                case 'skip':
                    message = `⏭ *Song Skipped from Web Player*\n\n🎵 ${data.song}\n👤 By: ${data.user}`;
                    break;
                case 'play':
                    message = `▶️ *Playback Resumed*\n👤 By: ${data.user}`;
                    break;
                case 'pause':
                    message = `⏸ *Playback Paused*\n👤 By: ${data.user}`;
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid action' });
            }

            const bot = telegramService.getBot();
            const sentMsg = await bot.telegram.sendMessage(roomId, message, {
                parse_mode: 'Markdown'
            });

            // Auto-delete after 30 seconds
            setTimeout(() => {
                bot.telegram.deleteMessage(roomId, sentMsg.message_id).catch(() => { });
            }, 30000);

            logger.info('group_notification_sent', { roomId, action });

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('[ValidationController] sendGroupNotification error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new ValidationController();
