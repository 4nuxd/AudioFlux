/**
 * Private Room Management Commands
 * Commands for managing private rooms, blocking users, and invite analytics
 */

const telegramService = require('../services/telegramService');
const redis = require('../redis');
const config = require('../config');

const bot = telegramService.getBot();

// /block command - Block user from private room
bot.command('block', async (ctx) => {
    try {
        const uid = ctx.from.id;
        const chatId = ctx.chat.id.toString();

        try { await ctx.deleteMessage(); } catch { }

        // Only works in private chat (DM)
        if (ctx.chat.type !== 'private') {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ This command only works in your private room (DM with bot).'
            );
        }

        // Get user's room
        const userRoom = await redis.getUserRoom(uid);
        if (!userRoom) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You don\'t have a private room yet. Use /start to create one.'
            );
        }

        // Check if room owner
        const roomMeta = await redis.getRoomMetadata(userRoom);
        if (!roomMeta || roomMeta.ownerId !== uid) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You are not the owner of this room.'
            );
        }

        // Get user ID to block from command
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ *Usage:* `/block <user_id>`\n\n' +
                'Example: `/block 123456789`\n\n' +
                'You can get user IDs from the room members list.',
                { parse_mode: 'Markdown' }
            );
        }

        const userIdToBlock = args[0].replace('@', '');

        // Can't block yourself
        if (userIdToBlock === uid.toString()) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You cannot block yourself!'
            );
        }

        // Can't block bot owner
        if (userIdToBlock === config.bot.ownerId) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You cannot block the bot owner!'
            );
        }

        // Block the user
        await redis.blockUserFromRoom(userRoom, userIdToBlock);

        await telegramService.sendAndAutoDelete(ctx, 'reply',
            `✅ *User Blocked*\n\n` +
            `🚫 User ID \`${userIdToBlock}\` has been blocked from your private room.\n\n` +
            `They will no longer be able to join your room.`,
            { parse_mode: 'Markdown' }
        );

        // Enhanced logger notification
        if (config.bot.loggerGroupId) {
            try {
                await telegramService.sendToLoggerGroup(
                    `🚫 *User Blocked from Private Room*\n\n` +
                    `👤 *Blocked By:* ${ctx.from.first_name || 'Unknown'}\n` +
                    `🆔 *Owner ID:* \`${uid}\`\n` +
                    `📱 *Owner Username:* ${ctx.from.username ? `@${ctx.from.username}` : 'None'}\n\n` +
                    `🎵 *Room ID:* \`${userRoom}\`\n` +
                    `🚫 *Blocked User ID:* \`${userIdToBlock}\`\n\n` +
                    `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                );
            } catch (e) {
                console.error('[RoomCmd] Failed to send logger notification:', e);
            }
        }

        console.log(`[RoomCmd] User ${userIdToBlock} blocked from room ${userRoom} by ${uid}`);
    } catch (e) {
        console.error('[RoomCmd] Error in /block command:', e);
        await telegramService.sendAndAutoDelete(ctx, 'reply', '❌ An error occurred.');
    }
});

// /unblock command - Unblock user from private room
bot.command('unblock', async (ctx) => {
    try {
        const uid = ctx.from.id;

        try { await ctx.deleteMessage(); } catch { }

        // Only works in private chat (DM)
        if (ctx.chat.type !== 'private') {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ This command only works in your private room (DM with bot).'
            );
        }

        // Get user's room
        const userRoom = await redis.getUserRoom(uid);
        if (!userRoom) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You don\'t have a private room yet. Use /start to create one.'
            );
        }

        // Check if room owner
        const roomMeta = await redis.getRoomMetadata(userRoom);
        if (!roomMeta || roomMeta.ownerId !== uid) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You are not the owner of this room.'
            );
        }

        // Get user ID to unblock from command
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ *Usage:* `/unblock <user_id>`\n\n' +
                'Example: `/unblock 123456789`',
                { parse_mode: 'Markdown' }
            );
        }

        const userIdToUnblock = args[0].replace('@', '');

        // Unblock the user
        await redis.unblockUserFromRoom(userRoom, userIdToUnblock);

        await telegramService.sendAndAutoDelete(ctx, 'reply',
            `✅ *User Unblocked*\n\n` +
            `👤 User ID \`${userIdToUnblock}\` has been unblocked.\n\n` +
            `They can now join your private room again.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`[RoomCmd] User ${userIdToUnblock} unblocked from room ${userRoom} by ${uid}`);
    } catch (e) {
        console.error('[RoomCmd] Error in /unblock command:', e);
        await telegramService.sendAndAutoDelete(ctx, 'reply', '❌ An error occurred.');
    }
});

// /blocklist command - Show blocked users
bot.command('blocklist', async (ctx) => {
    try {
        const uid = ctx.from.id;

        try { await ctx.deleteMessage(); } catch { }

        // Only works in private chat (DM)
        if (ctx.chat.type !== 'private') {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ This command only works in your private room (DM with bot).'
            );
        }

        // Get user's room
        const userRoom = await redis.getUserRoom(uid);
        if (!userRoom) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You don\'t have a private room yet. Use /start to create one.'
            );
        }

        // Check if room owner
        const roomMeta = await redis.getRoomMetadata(userRoom);
        if (!roomMeta || roomMeta.ownerId !== uid) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You are not the owner of this room.'
            );
        }

        // Get blocked users
        const blockedUsers = await redis.getBlockedUsers(userRoom);

        if (blockedUsers.length === 0) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '📋 *Blocked Users*\n\n' +
                '✅ No users are currently blocked from your room.',
                { parse_mode: 'Markdown' }
            );
        }

        const blockedList = blockedUsers.map((userId, index) =>
            `${index + 1}. User ID: \`${userId}\``
        ).join('\n');

        await telegramService.sendAndAutoDelete(ctx, 'reply',
            `🚫 *Blocked Users* (${blockedUsers.length})\n\n` +
            `${blockedList}\n\n` +
            `Use \`/unblock <user_id>\` to unblock a user.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`[RoomCmd] Blocklist viewed for room ${userRoom} by ${uid}`);
    } catch (e) {
        console.error('[RoomCmd] Error in /blocklist command:', e);
        await telegramService.sendAndAutoDelete(ctx, 'reply', '❌ An error occurred.');
    }
});

// /revokeinvite command - Revoke old invite link and generate new one
bot.command('revokeinvite', async (ctx) => {
    try {
        const uid = ctx.from.id;

        try { await ctx.deleteMessage(); } catch { }

        // Only works in private chat (DM)
        if (ctx.chat.type !== 'private') {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ This command only works in your private room (DM with bot).'
            );
        }

        // Get user's room
        const userRoom = await redis.getUserRoom(uid);
        if (!userRoom) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You don\'t have a private room yet. Use /start to create one.'
            );
        }

        // Check if room owner
        const roomMeta = await redis.getRoomMetadata(userRoom);
        if (!roomMeta || roomMeta.ownerId !== uid) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You are not the owner of this room.'
            );
        }

        // Check rate limit
        const canGenerate = await redis.canGenerateInvite(uid);
        if (!canGenerate) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '⏱ *Rate Limit*\n\n' +
                'You can only revoke invites 5 times per hour.\n' +
                'Please try again later.',
                { parse_mode: 'Markdown' }
            );
        }

        // Revoke old invite
        const newVersion = await redis.revokeInvite(userRoom);
        await redis.incrementInviteGeneration(uid);

        // Generate new invite link with version
        const newInviteLink = `https://t.me/${config.bot.username}?start=room_${userRoom}_v${newVersion}`;

        await ctx.reply(
            `🔄 *Invite Link Revoked*\n\n` +
            `✅ Old invite links are now invalid.\n` +
            `🔗 New invite link generated:\n\n` +
            `\`${newInviteLink}\`\n\n` +
            `⚠️ Share this new link to invite people to your room.`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 Share New Link', url: `https://t.me/share/url?url=${encodeURIComponent(newInviteLink)}&text=${encodeURIComponent('🎵 Join my private music room!')}` }]
                    ]
                }
            }
        );

        // Notify logger group
        if (config.bot.loggerGroupId) {
            try {
                await telegramService.sendToLoggerGroup(
                    `🔄 *Invite Revoked*\n\n` +
                    `👤 *User:* ${ctx.from.first_name || 'Unknown'}\n` +
                    `🆔 *User ID:* \`${uid}\`\n` +
                    `🎵 *Room ID:* \`${userRoom}\`\n` +
                    `🔢 *New Version:* ${newVersion}\n\n` +
                    `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                );
            } catch (e) {
                console.error('[RoomCmd] Failed to send logger notification:', e);
            }
        }

        console.log(`[RoomCmd] Invite revoked for room ${userRoom} by ${uid}, new version: ${newVersion}`);
    } catch (e) {
        console.error('[RoomCmd] Error in /revokeinvite command:', e);
        await telegramService.sendAndAutoDelete(ctx, 'reply', '❌ An error occurred.');
    }
});

// /roominfo command - Show room information
bot.command('roominfo', async (ctx) => {
    try {
        const uid = ctx.from.id;

        try { await ctx.deleteMessage(); } catch { }

        // Only works in private chat (DM)
        if (ctx.chat.type !== 'private') {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ This command only works in your private room (DM with bot).'
            );
        }

        // Get user's room
        const userRoom = await redis.getUserRoom(uid);
        if (!userRoom) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❗ You don\'t have a private room yet. Use /start to create one.'
            );
        }

        // Get room metadata
        const roomMeta = await redis.getRoomMetadata(userRoom);
        if (!roomMeta) {
            return telegramService.sendAndAutoDelete(ctx, 'reply',
                '❌ Room metadata not found.'
            );
        }

        // Get room stats
        const memberCount = await redis.getRoomMemberCount(userRoom);
        const blockedCount = (await redis.getBlockedUsers(userRoom)).length;
        const inviteVersion = roomMeta.inviteVersion || 0;
        const createdDate = new Date(roomMeta.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        await telegramService.sendAndAutoDelete(ctx, 'reply',
            `🔒 *Private Room Info*\n\n` +
            `👤 *Owner:* ${roomMeta.ownerName}\n` +
            `🆔 *Room ID:* \`${userRoom}\`\n` +
            `📅 *Created:* ${createdDate}\n\n` +
            `📊 *Statistics:*\n` +
            `👥 Members Joined: ${memberCount}\n` +
            `🚫 Blocked Users: ${blockedCount}\n` +
            `🔢 Invite Version: ${inviteVersion}\n\n` +
            `💡 *Commands:*\n` +
            `/block - Block a user\n` +
            `/unblock - Unblock a user\n` +
            `/blocklist - View blocked users\n` +
            `/revokeinvite - Generate new invite link`,
            { parse_mode: 'Markdown' }
        );

        console.log(`[RoomCmd] Room info viewed for ${userRoom} by ${uid}`);
    } catch (e) {
        console.error('[RoomCmd] Error in /roominfo command:', e);
        await telegramService.sendAndAutoDelete(ctx, 'reply', '❌ An error occurred.');
    }
});

console.log('[Bot] ✅ Room management commands loaded');

module.exports = bot;
