/**
 * Ban & Approval Service
 * Manages banned users, banned chats, and approved chats
 */

const { client } = require('../redis');
const logger = require('../logger');

class BanService {
    /**
     * Ban a user
     */
    async banUser(userId, reason = 'No reason provided', bannedBy = 'Admin') {
        try {
            const key = `banned:user:${userId}`;
            const data = {
                userId,
                reason,
                bannedBy,
                bannedAt: Date.now()
            };

            await client.set(key, JSON.stringify(data));
            logger.info('user_banned', { userId, reason, bannedBy });
            return true;
        } catch (error) {
            console.error('[BanService] Error banning user:', error);
            return false;
        }
    }

    /**
     * Unban a user
     */
    async unbanUser(userId) {
        try {
            const key = `banned:user:${userId}`;
            await client.del(key);
            logger.info('user_unbanned', { userId });
            return true;
        } catch (error) {
            console.error('[BanService] Error unbanning user:', error);
            return false;
        }
    }

    /**
     * Check if user is banned
     */
    async isUserBanned(userId) {
        try {
            const key = `banned:user:${userId}`;
            const data = await client.get(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (error) {
            console.error('[BanService] Error checking user ban:', error);
            return null;
        }
    }

    /**
     * Ban a chat
     */
    async banChat(chatId, reason = 'No reason provided', bannedBy = 'Admin') {
        try {
            const key = `banned:chat:${chatId}`;
            const data = {
                chatId,
                reason,
                bannedBy,
                bannedAt: Date.now()
            };

            await client.set(key, JSON.stringify(data));
            logger.info('chat_banned', { chatId, reason, bannedBy });
            return true;
        } catch (error) {
            console.error('[BanService] Error banning chat:', error);
            return false;
        }
    }

    /**
     * Unban a chat
     */
    async unbanChat(chatId) {
        try {
            const key = `banned:chat:${chatId}`;
            await client.del(key);
            logger.info('chat_unbanned', { chatId });
            return true;
        } catch (error) {
            console.error('[BanService] Error unbanning chat:', error);
            return false;
        }
    }

    /**
     * Check if chat is banned
     */
    async isChatBanned(chatId) {
        try {
            const key = `banned:chat:${chatId}`;
            const data = await client.get(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (error) {
            console.error('[BanService] Error checking chat ban:', error);
            return null;
        }
    }

    /**
     * Approve a chat
     */
    async approveChat(chatId, chatTitle, approvedBy = 'Admin') {
        try {
            const key = `approved:chat:${chatId}`;
            const data = {
                chatId,
                chatTitle,
                approvedBy,
                approvedAt: Date.now()
            };

            await client.set(key, JSON.stringify(data));
            logger.info('chat_approved', { chatId, chatTitle, approvedBy });
            return true;
        } catch (error) {
            console.error('[BanService] Error approving chat:', error);
            return false;
        }
    }

    /**
     * Unapprove a chat
     */
    async unapproveChat(chatId) {
        try {
            const key = `approved:chat:${chatId}`;
            await client.del(key);
            logger.info('chat_unapproved', { chatId });
            return true;
        } catch (error) {
            console.error('[BanService] Error unapprove chat:', error);
            return false;
        }
    }

    /**
     * Check if chat is approved
     */
    async isChatApproved(chatId) {
        try {
            const key = `approved:chat:${chatId}`;
            const data = await client.get(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (error) {
            console.error('[BanService] Error checking chat approval:', error);
            return null;
        }
    }

    /**
     * Get all banned users
     */
    async getAllBannedUsers() {
        try {
            const keys = await client.keys('banned:user:*');
            const users = [];

            for (const key of keys) {
                const data = await client.get(key);
                if (data) users.push(JSON.parse(data));
            }

            return users;
        } catch (error) {
            console.error('[BanService] Error getting banned users:', error);
            return [];
        }
    }

    /**
     * Get all banned chats
     */
    async getAllBannedChats() {
        try {
            const keys = await client.keys('banned:chat:*');
            const chats = [];

            for (const key of keys) {
                const data = await client.get(key);
                if (data) chats.push(JSON.parse(data));
            }

            return chats;
        } catch (error) {
            console.error('[BanService] Error getting banned chats:', error);
            return [];
        }
    }

    /**
     * Get all approved chats
     */
    async getAllApprovedChats() {
        try {
            const keys = await client.keys('approved:chat:*');
            const chats = [];

            for (const key of keys) {
                const data = await client.get(key);
                if (data) chats.push(JSON.parse(data));
            }

            return chats;
        } catch (error) {
            console.error('[BanService] Error getting approved chats:', error);
            return [];
        }
    }

    /**
     * Log user/chat activity for history
     */
    async logActivity(type, id, action, details = {}) {
        try {
            const key = `history:${type}:${id}`;
            const activity = {
                type,
                id,
                action,
                details,
                timestamp: Date.now()
            };

            // Store last 100 activities
            await client.lpush(key, JSON.stringify(activity));
            await client.ltrim(key, 0, 99);

            logger.info('activity_logged', { type, id, action });
        } catch (error) {
            console.error('[BanService] Error logging activity:', error);
        }
    }

    /**
     * Get history for user or chat
     */
    async getHistory(type, id, limit = 50) {
        try {
            const key = `history:${type}:${id}`;
            const activities = await client.lrange(key, 0, limit - 1);

            return activities.map(a => JSON.parse(a));
        } catch (error) {
            console.error('[BanService] Error getting history:', error);
            return [];
        }
    }
}

module.exports = new BanService();
