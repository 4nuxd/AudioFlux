/**
 * Logger Functions - Advanced logging to private logger group
 * Sends rich formatted logs with photos and buttons to a private Telegram group
 */

const { Markup } = require('telegraf');
const telegramService = require('../services/telegramService');
const logger = require('../logger');
const config = require('../config');
const { generateSongThumbnail } = require('./thumbnailGenerator');

const bot = telegramService.getBot();
const BOT_TOKEN = process.env.BOT_TOKEN;
const LOGGER_GROUP_ID = process.env.LOGGER_GROUP_ID || null;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.WEB_PLAYER_URL;

/**
 * Generate appropriate link for group or private room
 */
function getGroupOrRoomLink(groupId) {
    // Check if it's a private room (starts with 'private_')
    if (typeof groupId === 'string' && groupId.startsWith('private_')) {
        // Return web app link for private room
        return `${FRONTEND_URL}/room/${groupId}`;
    }

    // Return Telegram group link for regular groups
    return `https://t.me/c/${groupId.toString().replace('-100', '')}/1`;
}


/**
 * Get user profile photo file_id
 */
async function getUserProfilePhoto(userId) {
    try {
        const photos = await bot.telegram.getUserProfilePhotos(userId, 0, 1);
        if (photos && photos.photos && photos.photos.length > 0) {
            // Return the file_id directly - Telegram can use this
            return photos.photos[0][0].file_id;
        }
        return null;
    } catch (e) {
        console.error('[Logger] Error getting profile photo:', e.message);
        return null;
    }
}

/**
 * Send log to private logger group with rich formatting
 */
async function sendToLoggerGroup(message, photoIdOrUrl = null, buttons = []) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const keyboard = buttons.length > 0 ? Markup.inlineKeyboard(buttons) : null;

        // Try to send with photo if provided
        if (photoIdOrUrl) {
            try {
                await bot.telegram.sendPhoto(LOGGER_GROUP_ID, photoIdOrUrl, {
                    caption: message,
                    parse_mode: 'Markdown',
                    ...(keyboard ? keyboard : {})
                });
                return; // Success
            } catch (photoError) {
                // Photo failed, fall back to text-only
                console.error('[Logger] Photo send failed, sending text only:', photoError.message);
            }
        }

        // Send text-only message (no photo or photo failed)
        await bot.telegram.sendMessage(LOGGER_GROUP_ID, message, {
            parse_mode: 'Markdown',
            ...(keyboard ? keyboard : {})
        });
    } catch (e) {
        console.error('[Logger] Error sending to logger group:', e.message);
    }
}

/**
 * Log when bot is added to a group
 */
async function logBotAddedToGroup(groupId, groupTitle, addedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = addedBy.username
            ? `@${addedBy.username}`
            : `[${addedBy.first_name || 'User'}](tg://user?id=${addedBy.id})`;

        const message =
            `🤖 *Bot Added to New Group!*\n\n` +
            `📊 *Group:* ${groupTitle}\n` +
            `🆔 *Group ID:* \`${groupId}\`\n` +
            `👤 *Added by:* ${userLink}\n` +
            `🆔 *User ID:* \`${addedBy.id}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('👤 User Profile', `tg://user?id=${addedBy.id}`)],
            [Markup.button.url('📊 Open Group', getGroupOrRoomLink(groupId))]
        ];

        const photoUrl = await getUserProfilePhoto(addedBy.id);
        await sendToLoggerGroup(message, photoUrl, buttons);

        logger.info('bot_added_logged', { groupId, addedBy: addedBy.id });
    } catch (e) {
        console.error('[Logger] Error logging bot added:', e.message);
    }
}

/**
 * Log when user starts the bot
 */
async function logUserStartedBot(user, startPayload = null) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = user.username
            ? `@${user.username}`
            : `[${user.first_name || 'User'}](tg://user?id=${user.id})`;

        const message =
            `✨ *User Started Bot!*\n\n` +
            `👤 *User:* ${userLink}\n` +
            `🆔 *User ID:* \`${user.id}\`\n` +
            `📱 *Username:* ${user.username ? `@${user.username}` : 'None'}\n` +
            `🌐 *Language:* ${user.language_code || 'Unknown'}\n` +
            (startPayload ? `🔗 *Payload:* \`${startPayload}\`\n` : '') +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('👤 User Profile', `tg://user?id=${user.id}`)]
        ];

        const photoUrl = await getUserProfilePhoto(user.id);
        await sendToLoggerGroup(message, photoUrl, buttons);

        logger.info('user_start_logged', { userId: user.id });
    } catch (e) {
        console.error('[Logger] Error logging user start:', e.message);
    }
}

/**
 * Log when a song is played
 */
async function logSongPlayed(groupId, groupTitle, song, user) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = user.username
            ? `@${user.username}`
            : `[${user.name || 'User'}](tg://user?id=${user.id})`;

        const artistsStr = Array.isArray(song.artists) ? song.artists.join(', ') : song.artists;
        const durationMin = Math.floor(song.duration / 60);
        const durationSec = song.duration % 60;

        const message =
            `🎵 *Song Played!*\n\n` +
            `📀 *Song:* ${song.title}\n` +
            `🎤 *Artist:* ${artistsStr}\n` +
            `⏱ *Duration:* ${durationMin}:${durationSec.toString().padStart(2, '0')}\n` +
            `🎼 *Source:* ${song.source === 'youtube' ? 'YouTube' : 'JioSaavn'}\n\n` +
            `📊 *Group:* ${groupTitle}\n` +
            `🆔 *Group ID:* \`${groupId}\`\n\n` +
            `👤 *Played by:* ${userLink}\n` +
            `🆔 *User ID:* \`${user.id}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [
                Markup.button.url('👤 User', `tg://user?id=${user.id}`),
                Markup.button.url('📊 Room', getGroupOrRoomLink(groupId))
            ]
        ];

        // Generate aesthetic thumbnail
        let thumbnailBuffer = null;
        try {
            thumbnailBuffer = await generateSongThumbnail(song, 'playing');
        } catch (e) {
            console.error('[Logger] Error generating thumbnail:', e.message);
        }

        await sendToLoggerGroup(message, thumbnailBuffer ? { source: thumbnailBuffer } : song.thumbnail, buttons);

        logger.info('song_play_logged', { groupId, songId: song.id, userId: user.id });
    } catch (e) {
        console.error('[Logger] Error logging song play:', e.message);
    }
}

/**
 * Log when user joins player room
 */
async function logUserJoinedRoom(groupId, groupTitle, user) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = user.username
            ? `@${user.username}`
            : `[${user.firstName || 'User'}](tg://user?id=${user.id})`;

        const message =
            `🟢 *User Joined Player!*\n\n` +
            `👤 *User:* ${userLink}\n` +
            `🆔 *User ID:* \`${user.id}\`\n` +
            `📱 *Username:* ${user.username ? `@${user.username}` : 'None'}\n\n` +
            `📊 *Group:* ${groupTitle || 'Unknown'}\n` +
            `🆔 *Group ID:* \`${groupId}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [
                Markup.button.url('👤 User', `tg://user?id=${user.id}`),
                Markup.button.url('📊 Room', getGroupOrRoomLink(groupId))
            ]
        ];

        const photoUrl = user.photoUrl || await getUserProfilePhoto(user.id);
        await sendToLoggerGroup(message, photoUrl, buttons);

        logger.info('user_join_logged', { groupId, userId: user.id });
    } catch (e) {
        console.error('[Logger] Error logging user join:', e.message);
    }
}

/**
 * Log when user leaves player room
 */
async function logUserLeftRoom(groupId, groupTitle, user, sessionMinutes) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = user.username
            ? `@${user.username}`
            : `[${user.firstName || 'User'}](tg://user?id=${user.id})`;

        const message =
            `🔴 *User Left Player!*\n\n` +
            `👤 *User:* ${userLink}\n` +
            `🆔 *User ID:* \`${user.id}\`\n` +
            `📱 *Username:* ${user.username ? `@${user.username}` : 'None'}\n\n` +
            `📊 *Group:* ${groupTitle || 'Unknown'}\n` +
            `🆔 *Group ID:* \`${groupId}\`\n` +
            `⏱ *Session:* ${sessionMinutes} minutes\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [
                Markup.button.url('👤 User', `tg://user?id=${user.id}`),
                Markup.button.url('📊 Room', getGroupOrRoomLink(groupId))
            ]
        ];

        const photoUrl = user.photoUrl || await getUserProfilePhoto(user.id);
        await sendToLoggerGroup(message, photoUrl, buttons);

        logger.info('user_leave_logged', { groupId, userId: user.id, sessionMinutes });
    } catch (e) {
        console.error('[Logger] Error logging user leave:', e.message);
    }
}

/**
 * Log when song is added to queue (not immediately played)
 */
async function logSongAddedToQueue(groupId, groupTitle, song, user) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = user.username
            ? `@${user.username}`
            : `[${user.name || 'User'}](tg://user?id=${user.id})`;

        const artistsStr = Array.isArray(song.artists) ? song.artists.join(', ') : song.artists;
        const durationMin = Math.floor(song.duration / 60);
        const durationSec = song.duration % 60;

        const message =
            `➕ *Song Added to Queue!*\n\n` +
            `📀 *Song:* ${song.title}\n` +
            `🎤 *Artist:* ${artistsStr}\n` +
            `⏱ *Duration:* ${durationMin}:${durationSec.toString().padStart(2, '0')}\n` +
            `🎼 *Source:* ${song.source === 'saavn' ? 'JioSaavn' : song.source === 'spotify' ? 'Spotify' : 'Unknown'}\n\n` +
            `📊 *Group:* ${groupTitle}\n` +
            `🆔 *Group ID:* \`${groupId}\`\n\n` +
            `👤 *Added by:* ${userLink}\n` +
            `🆔 *User ID:* \`${user.id}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [
                Markup.button.url('👤 User', `tg://user?id=${user.id}`),
                Markup.button.url('📊 Room', getGroupOrRoomLink(groupId))
            ]
        ];

        await sendToLoggerGroup(message, song.thumbnail, buttons);

        logger.info('song_queue_logged', { groupId, songId: song.id, userId: user.id });
    } catch (e) {
        console.error('[Logger] Error logging song added to queue:', e.message);
    }
}

/**
 * Log when bot is removed from a group
 */
async function logBotRemovedFromGroup(groupId, groupTitle, removedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = removedBy?.username
            ? `@${removedBy.username}`
            : removedBy?.id ? `[${removedBy.firstName || 'User'}](tg://user?id=${removedBy.id})` : 'Unknown';

        const message =
            `🔴 *Bot Removed from Group!*\n\n` +
            `📊 *Group:* ${groupTitle || 'Unknown'}\n` +
            `🆔 *Group ID:* \`${groupId}\`\n\n` +
            `👤 *Removed by:* ${userLink}\n` +
            `🆔 *User ID:* \`${removedBy?.id || 'Unknown'}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = removedBy?.id ? [
            [
                Markup.button.url('👤 User', `tg://user?id=${removedBy.id}`),
                Markup.button.url('📊 Group', getGroupOrRoomLink(groupId))
            ]
        ] : [];

        await sendToLoggerGroup(message, null, buttons);

        logger.info('bot_removed_from_group', { groupId, removedBy: removedBy?.id });
    } catch (e) {
        console.error('[Logger] Error logging bot removal:', e.message);
    }
}

// Log user ban
async function logUserBanned(userId, userName, reason, bannedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = `[${userName}](tg://user?id=${userId})`;

        const message =
            `🚫 *User Banned!*\n\n` +
            `👤 *User:* ${userLink}\n` +
            `🆔 *User ID:* \`${userId}\`\n\n` +
            `📝 *Reason:* ${reason}\n` +
            `👮 *Banned by:* ${bannedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('👤 View User', `tg://user?id=${userId}`)]
        ];

        await sendToLoggerGroup(message, null, buttons);
        logger.info('user_banned', { userId, reason, bannedBy });
    } catch (e) {
        console.error('[Logger] Error logging user ban:', e.message);
    }
}

// Log user unban
async function logUserUnbanned(userId, userName, unbannedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const userLink = `[${userName}](tg://user?id=${userId})`;

        const message =
            `✅ *User Unbanned!*\n\n` +
            `👤 *User:* ${userLink}\n` +
            `🆔 *User ID:* \`${userId}\`\n\n` +
            `👮 *Unbanned by:* ${unbannedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('👤 View User', `tg://user?id=${userId}`)]
        ];

        await sendToLoggerGroup(message, null, buttons);
        logger.info('user_unbanned', { userId, unbannedBy });
    } catch (e) {
        console.error('[Logger] Error logging user unban:', e.message);
    }
}

// Log chat ban
async function logChatBanned(chatId, chatTitle, reason, bannedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const message =
            `🚫 *Chat Banned!*\n\n` +
            `📊 *Chat:* ${chatTitle}\n` +
            `🆔 *Chat ID:* \`${chatId}\`\n\n` +
            `📝 *Reason:* ${reason}\n` +
            `👮 *Banned by:* ${bannedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('📊 View Chat', getGroupOrRoomLink(chatId))]
        ];

        await sendToLoggerGroup(message, null, buttons);
        logger.info('chat_banned', { chatId, reason, bannedBy });
    } catch (e) {
        console.error('[Logger] Error logging chat ban:', e.message);
    }
}

// Log chat unban
async function logChatUnbanned(chatId, chatTitle, unbannedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const message =
            `✅ *Chat Unbanned!*\n\n` +
            `📊 *Chat:* ${chatTitle}\n` +
            `🆔 *Chat ID:* \`${chatId}\`\n\n` +
            `👮 *Unbanned by:* ${unbannedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('📊 View Chat', getGroupOrRoomLink(chatId))]
        ];

        await sendToLoggerGroup(message, null, buttons);
        logger.info('chat_unbanned', { chatId, unbannedBy });
    } catch (e) {
        console.error('[Logger] Error logging chat unban:', e.message);
    }
}

// Log chat approval
async function logChatApproved(chatId, chatTitle, approvedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const message =
            `✅ *Chat Approved!*\n\n` +
            `📊 *Chat:* ${chatTitle}\n` +
            `🆔 *Chat ID:* \`${chatId}\`\n\n` +
            `👮 *Approved by:* ${approvedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('📊 View Chat', getGroupOrRoomLink(chatId))]
        ];

        await sendToLoggerGroup(message, null, buttons);
        logger.info('chat_approved', { chatId, approvedBy });
    } catch (e) {
        console.error('[Logger] Error logging chat approval:', e.message);
    }
}

// Log chat unapproval
async function logChatUnapproved(chatId, chatTitle, unapprovedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const message =
            `⚠️ *Chat Unapproved!*\n\n` +
            `📊 *Chat:* ${chatTitle}\n` +
            `🆔 *Chat ID:* \`${chatId}\`\n\n` +
            `👮 *Unapproved by:* ${unapprovedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const buttons = [
            [Markup.button.url('📊 View Chat', getGroupOrRoomLink(chatId))]
        ];

        await sendToLoggerGroup(message, null, buttons);
        logger.info('chat_unapproved', { chatId, unapprovedBy });
    } catch (e) {
        console.error('[Logger] Error logging chat unapproval:', e.message);
    }
}

// Log server reboot
async function logServerReboot(initiatedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const message =
            `🔄 *Server Reboot Initiated!*\n\n` +
            `👮 *Initiated by:* ${initiatedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
            `_Server will be back online in ~30 seconds_`;

        await sendToLoggerGroup(message, null, []);
        logger.info('server_reboot', { initiatedBy });
    } catch (e) {
        console.error('[Logger] Error logging server reboot:', e.message);
    }
}

// Log broadcast
async function logBroadcast(type, messageCount, successCount, failCount, initiatedBy) {
    if (!LOGGER_GROUP_ID) return;

    try {
        const message =
            `📢 *Broadcast ${type === 'users' ? 'to Users' : 'to Groups'}!*\n\n` +
            `📊 *Total:* ${messageCount}\n` +
            `✅ *Sent:* ${successCount}\n` +
            `❌ *Failed:* ${failCount}\n\n` +
            `👮 *Initiated by:* ${initiatedBy}\n` +
            `⏰ *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        await sendToLoggerGroup(message, null, []);
        logger.info('broadcast_completed', { type, messageCount, successCount, failCount, initiatedBy });
    } catch (e) {
        console.error('[Logger] Error logging broadcast:', e.message);
    }
}

module.exports = {
    getUserProfilePhoto,
    sendToLoggerGroup,
    logBotAddedToGroup,
    logUserStartedBot,
    logSongPlayed,
    logUserJoinedRoom,
    logUserLeftRoom,
    logSongAddedToQueue,
    logBotRemovedFromGroup,
    logUserBanned,
    logUserUnbanned,
    logChatBanned,
    logChatUnbanned,
    logChatApproved,
    logChatUnapproved,
    logServerReboot,
    logBroadcast
};
