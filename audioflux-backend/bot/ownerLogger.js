const bot = require('./index');

class OwnerActivityLogger {
    constructor() {
        this.loggerGroupId = process.env.LOGGER_GROUP_ID;
        this.enabled = !!this.loggerGroupId;

        if (!this.enabled) {
            console.warn('[OwnerLogger] LOGGER_GROUP_ID not configured - owner activity logging disabled');
        }
    }

    /**
     * Log owner activity to logger group
     * @param {string} action - Action performed (e.g., 'notify', 'ban', 'broadcast')
     * @param {object} details - Details about the action
     * @param {object} ctx - Telegram context (optional)
     */
    async log(action, details = {}, ctx = null) {
        if (!this.enabled) return;

        try {
            const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const ownerId = ctx?.from?.id || details.ownerId || process.env.OWNER_ID;
            const ownerName = ctx?.from?.first_name || details.ownerName || 'Owner';
            const ownerUsername = ctx?.from?.username ? `@${ctx.from.username}` : details.ownerUsername || 'N/A';

            // Build log message
            let message = `🔐 <b>OWNER ACTIVITY LOG</b>\n\n`;
            message += `👤 <b>User:</b> ${ownerName} (${ownerUsername})\n`;
            message += `🆔 <b>ID:</b> <code>${ownerId}</code>\n`;
            message += `⚡ <b>Action:</b> <code>${action}</code>\n`;
            message += `🕐 <b>Time:</b> ${timestamp}\n\n`;

            // Add specific details based on action
            if (Object.keys(details).length > 0) {
                message += `📋 <b>Details:</b>\n`;

                for (const [key, value] of Object.entries(details)) {
                    if (key === 'ownerId' || key === 'ownerName' || key === 'ownerUsername') continue;

                    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');

                    if (typeof value === 'object' && value !== null) {
                        message += `  • <b>${formattedKey}:</b> <code>${JSON.stringify(value)}</code>\n`;
                    } else if (typeof value === 'string' && value.length > 100) {
                        message += `  • <b>${formattedKey}:</b>\n    <code>${value.substring(0, 100)}...</code>\n`;
                    } else {
                        message += `  • <b>${formattedKey}:</b> <code>${value}</code>\n`;
                    }
                }
            }

            // Send to logger group
            await bot.telegram.sendMessage(this.loggerGroupId, message, { parse_mode: 'HTML' });
            console.log(`[OwnerLogger] Logged activity: ${action}`);
        } catch (error) {
            console.error('[OwnerLogger] Failed to log activity:', error.message);
        }
    }

    /**
     * Log notification sent by owner
     */
    async logNotification(message, ctx) {
        await this.log('NOTIFICATION_SENT', {
            message: message,
            messageLength: message.length,
            broadcastType: 'All Users'
        }, ctx);
    }

    /**
     * Log user ban
     */
    async logUserBan(userId, username, reason, ctx) {
        await this.log('USER_BANNED', {
            targetUserId: userId,
            targetUsername: username,
            reason: reason || 'No reason provided'
        }, ctx);
    }

    /**
     * Log user unban
     */
    async logUserUnban(userId, username, ctx) {
        await this.log('USER_UNBANNED', {
            targetUserId: userId,
            targetUsername: username
        }, ctx);
    }

    /**
     * Log chat ban
     */
    async logChatBan(chatId, chatTitle, reason, ctx) {
        await this.log('CHAT_BANNED', {
            targetChatId: chatId,
            chatTitle: chatTitle,
            reason: reason || 'No reason provided'
        }, ctx);
    }

    /**
     * Log chat unban
     */
    async logChatUnban(chatId, chatTitle, ctx) {
        await this.log('CHAT_UNBANNED', {
            targetChatId: chatId,
            chatTitle: chatTitle
        }, ctx);
    }

    /**
     * Log broadcast message
     */
    async logBroadcast(message, targetType, successCount, failCount, ctx) {
        await this.log('BROADCAST_SENT', {
            message: message.substring(0, 100),
            targetType: targetType,
            successCount: successCount,
            failedCount: failCount,
            totalAttempted: successCount + failCount
        }, ctx);
    }

    /**
     * Log rate limit change
     */
    async logRateLimitChange(userId, username, action, ctx) {
        await this.log('RATE_LIMIT_CHANGED', {
            targetUserId: userId,
            targetUsername: username,
            action: action // 'freed' or 'limited'
        }, ctx);
    }

    /**
     * Log server reboot
     */
    async logReboot(ctx) {
        await this.log('SERVER_REBOOT', {
            initiatedBy: 'Owner Command'
        }, ctx);
    }

    /**
     * Log stats view
     */
    async logStatsView(statsType, ctx) {
        await this.log('STATS_VIEWED', {
            statsType: statsType
        }, ctx);
    }
}

module.exports = new OwnerActivityLogger();
