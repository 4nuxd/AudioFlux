const {
    setOwner, getOwner,
    addModerator, removeModerator, isModerator,
    addApproved, removeApproved, isApproved,
    banUser, unbanUser, isBanned
} = require('../redis');
const logger = require('../logger');
const config = require('../config');

class PermissionService {
    /**
     * Check if user is owner
     */
    async isOwner(groupId, userId) {
        try {
            const owner = await getOwner(groupId);
            return owner == userId || userId.toString() === config.bot.ownerId;
        } catch (error) {
            console.error('[PermissionService] Error checking owner:', error);
            return false;
        }
    }

    /**
     * Check if user is moderator
     */
    async isMod(groupId, userId) {
        try {
            return await isModerator(groupId, userId);
        } catch (error) {
            console.error('[PermissionService] Error checking mod:', error);
            return false;
        }
    }

    /**
     * Check if user is approved
     */
    async isApprovedUser(groupId, userId) {
        try {
            return await isApproved(groupId, userId);
        } catch (error) {
            console.error('[PermissionService] Error checking approved:', error);
            return false;
        }
    }

    /**
     * Check if user is banned
     */
    async isBanned(groupId, userId) {
        try {
            return await isBanned(groupId, userId);
        } catch (error) {
            console.error('[PermissionService] Error checking banned:', error);
            return false;
        }
    }

    /**
     * Set group owner
     */
    async setOwner(groupId, userId) {
        try {
            await setOwner(groupId, userId);
            logger.info('owner_set', { groupId, userId });
        } catch (error) {
            console.error('[PermissionService] Error setting owner:', error);
            logger.error('set_owner_error', { error: error.message, groupId, userId });
            throw error;
        }
    }

    /**
     * Add moderator
     */
    async addModerator(groupId, userId) {
        try {
            await addModerator(groupId, userId);
            logger.info('moderator_added', { groupId, userId });
        } catch (error) {
            console.error('[PermissionService] Error adding moderator:', error);
            logger.error('add_moderator_error', { error: error.message, groupId, userId });
            throw error;
        }
    }

    /**
     * Remove moderator
     */
    async removeModerator(groupId, userId) {
        try {
            await removeModerator(groupId, userId);
            logger.info('moderator_removed', { groupId, userId });
        } catch (error) {
            console.error('[PermissionService] Error removing moderator:', error);
            logger.error('remove_moderator_error', { error: error.message, groupId, userId });
            throw error;
        }
    }

    /**
     * Add approved user
     */
    async addApproved(groupId, userId) {
        try {
            await addApproved(groupId, userId);
            logger.info('approved_user_added', { groupId, userId });
        } catch (error) {
            console.error('[PermissionService] Error adding approved user:', error);
            logger.error('add_approved_error', { error: error.message, groupId, userId });
            throw error;
        }
    }

    /**
     * Remove approved user
     */
    async removeApproved(groupId, userId) {
        try {
            await removeApproved(groupId, userId);
            logger.info('approved_user_removed', { groupId, userId });
        } catch (error) {
            console.error('[PermissionService] Error removing approved user:', error);
            logger.error('remove_approved_error', { error: error.message, groupId, userId });
            throw error;
        }
    }

    /**
     * Ban user
     */
    async banUser(groupId, userId) {
        try {
            await banUser(groupId, userId);
            logger.info('user_banned', { groupId, userId });
        } catch (error) {
            console.error('[PermissionService] Error banning user:', error);
            logger.error('ban_user_error', { error: error.message, groupId, userId });
            throw error;
        }
    }

    /**
     * Unban user
     */
    async unbanUser(groupId, userId) {
        try {
            await unbanUser(groupId, userId);
            logger.info('user_unbanned', { groupId, userId });
        } catch (error) {
            console.error('[PermissionService] Error unbanning user:', error);
            logger.error('unban_user_error', { error: error.message, groupId, userId });
            throw error;
        }
    }
}

module.exports = new PermissionService();
