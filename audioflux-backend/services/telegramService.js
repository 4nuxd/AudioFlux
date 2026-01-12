const { Telegraf, Markup } = require('telegraf');
const config = require('../config');
const logger = require('../logger');


class TelegramService {
    constructor() {
        this.bot = new Telegraf(config.bot.token);
        this.autoDeleteTime = config.app.autoDeleteTime;
    }

    /**
     * Get bot instance
     */
    getBot() {
        return this.bot;
    }

    /**
     * Send message and auto-delete after timeout
     */
    async sendAndAutoDelete(ctx, method, ...args) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const sentMsg = await ctx[method](...args);
                if (sentMsg && sentMsg.message_id && ctx.chat) {
                    // Auto-delete after configured time
                    setTimeout(() => {
                        this.bot.telegram.deleteMessage(ctx.chat.id, sentMsg.message_id).catch(() => { });
                    }, this.autoDeleteTime);
                }
                return sentMsg;
            } catch (e) {
                lastError = e;

                // Check if it's a rate limit error (429)
                if (e.response && e.response.error_code === 429) {
                    const retryAfter = e.response.parameters?.retry_after || 1;
                    const waitTime = (retryAfter + attempt) * 1000;

                    console.log(`[TelegramService] Rate limit hit (429), waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);

                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }

                console.error(`[TelegramService] sendAndAutoDelete error (attempt ${attempt + 1}):`, e);
                throw e;
            }
        }

        console.error('[TelegramService] sendAndAutoDelete failed after all retries:', lastError);
        throw lastError;
    }

    /**
     * Get user profile photo URL
     */
    async getUserProfilePhoto(userId) {
        try {
            const photos = await this.bot.telegram.getUserProfilePhotos(userId, 0, 1);
            if (photos.photos.length > 0) {
                const file = await this.bot.telegram.getFileLink(photos.photos[0][0].file_id);
                return file.href;
            }
            return null;
        } catch (e) {
            console.error('[TelegramService] Error fetching user photo:', e);
            return null;
        }
    }

    /**
     * Send action notification to group
     */
    async sendActionNotification(groupId, action, user, song = null) {
        try {
            if (!groupId || !config.bot.username) return;

            // Skip Telegram notifications for private rooms
            if (groupId.toString().startsWith('private_')) {
                return;
            }

            const deepLink = `https://t.me/${config.bot.username}?startapp=room_${groupId}`;
            const controlKeyboard = {
                inline_keyboard: [
                    [
                        { text: '▶️ Play', callback_data: 'play' },
                        { text: '⏸ Pause', callback_data: 'pause' },
                        { text: '⏭ Skip', callback_data: 'skip' }
                    ],
                    [
                        { text: '🎵 Open Player', url: deepLink }
                    ]
                ]
            };

            let sentMsg;

            if (action === 'addSong' && song) {
                // Send styled message with image for added song
                const durationMin = Math.floor(song.duration / 60);
                const durationSec = song.duration % 60;
                const artistsStr = Array.isArray(song.artists) ? song.artists.join(', ') : song.artists;
                const username = user.username ? `@${user.username}` : user.firstName || user.name || 'User';
                const sourceEmoji = song.source === 'saavn' ? '🎵' : song.source === 'spotify' ? '🎧' : '🎶';

                const caption =
                    `➕ *ADDED TO QUEUE*\n\n` +
                    `🎼 *${song.title}*\n` +
                    `🎤 _${artistsStr}_\n\n` +
                    `⏱ ${durationMin}:${durationSec.toString().padStart(2, '0')} • ` +
                    `${sourceEmoji} ${(song.source || 'Unknown').toUpperCase()}\n` +
                    `👤 Added by *${username}*`;

                // Use original JioSaavn thumbnail directly
                sentMsg = await this.bot.telegram.sendPhoto(groupId,
                    song.thumbnail,
                    {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: controlKeyboard
                    }
                );
            } else if (action === 'skip') {
                const message = `⏭ ${user.firstName || user.username || 'User'} skipped the current song`;
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            } else if (action === 'play' || action === 'pause') {
                const emoji = action === 'play' ? '▶️' : '⏸';
                const actionText = action === 'play' ? 'resumed' : 'paused';
                const message = `${emoji} ${user.firstName || user.username || 'User'} ${actionText} playback`;

                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            } else if (action === 'loop') {
                const message = `🔁 ${user.firstName || user.username || 'User'} ${song.mode === 'disabled' ? 'disabled' : 'enabled'} loop mode${song.mode !== 'disabled' ? ` (${song.mode})` : ''}`;
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            } else if (action === 'previous') {
                const songTitle = song?.songTitle ? ` to "${song.songTitle}"` : '';
                const message = `⏮ ${user.firstName || user.username || 'User'} went back${songTitle}`;
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            } else if (action === 'removeFromQueue') {
                // Format song details for removal notification
                const artistsStr = Array.isArray(song.artists) ? song.artists.join(', ') : song.artists;
                const message =
                    `🗑 *REMOVED FROM QUEUE*\n\n` +
                    `🎼 *${song.title}*\n` +
                    `🎤 _${artistsStr}_\n\n` +
                    `👤 Removed by *${user.firstName || user.username || 'User'}*`;

                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            } else if (action === 'shuffle') {
                const message = `🔀 ${user.firstName || user.username || 'User'} shuffled the queue (${song.queueLength} songs)`;
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            } else if (action === 'autoPlayOn') {
                const message = `🎵 *Auto-play enabled!*\n\n${user.firstName || user.username || 'User'} turned on auto-play.\n\nSongs will be automatically added when the queue ends.`;
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            } else if (action === 'autoPlayOff') {
                const removedCount = song?.removedCount || 0;
                const removedText = removedCount > 0
                    ? `\n\n${removedCount} auto-play song${removedCount > 1 ? 's' : ''} removed from queue.`
                    : '';
                const message = `⏸ *Auto-play disabled!*\n\n${user.firstName || user.username || 'User'} turned off auto-play.${removedText}`;
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Join Player', url: deepLink }]]
                    }
                });
            }

            if (sentMsg) {
                console.log('[TelegramService] ✅ Notification sent successfully:', {
                    messageId: sentMsg.message_id,
                    groupId,
                    action,
                    hasPhoto: !!sentMsg.photo
                });

                // Auto-delete after 10 seconds
                setTimeout(() => {
                    this.bot.telegram.deleteMessage(groupId, sentMsg.message_id).catch(() => { });
                }, 10000);

                logger.info('action_notification_sent', { groupId, action, user: user.username || user.id, messageId: sentMsg.message_id });
            } else {
                console.log('[TelegramService] ⚠️ No message was sent for action:', action);
            }
        } catch (e) {
            console.error('[TelegramService] ❌ Error sending action notification:', e);
            console.error('[TelegramService] Error details:', {
                message: e.message,
                code: e.code,
                response: e.response?.description
            });
            logger.error('action_notification_error', { error: e.message, groupId, action });
        }
    }

    /**
     * Send now playing notification
     */
    async sendNowPlayingNotification(groupId, song) {
        try {
            if (!song || !config.server.webPlayerUrl || !config.bot.username) return;

            // Skip Telegram notifications for private rooms
            if (groupId && groupId.toString().startsWith('private_')) {
                return;
            }

            const durationMin = Math.floor(song.duration / 60);
            const durationSec = song.duration % 60;

            // Handle addedBy as object or string, or check for auto-play
            let addedByStr = 'Unknown';
            if (song.isAutoPlay) {
                addedByStr = '✨ Auto-Play';
            } else if (typeof song.addedBy === 'object' && song.addedBy) {
                addedByStr = song.addedBy.username ? `@${song.addedBy.username}` : song.addedBy.name || 'Unknown';
            } else if (typeof song.addedBy === 'string') {
                addedByStr = song.addedBy;
            }

            const artistsStr = Array.isArray(song.artists) ? song.artists.join(', ') : song.artists;
            const sourceEmoji = song.source === 'saavn' ? '🎵' : song.source === 'spotify' ? '🎧' : '🎶';

            const caption =
                `🎵 *NOW PLAYING*\n\n` +
                `🎼 *${song.title}*\n` +
                `🎤 _${artistsStr}_\n\n` +
                `⏱ ${durationMin}:${durationSec.toString().padStart(2, '0')} • ` +
                `${sourceEmoji} ${(song.source || 'Unknown').toUpperCase()}\n` +
                `👤 Requested by *${addedByStr}*`;

            const deepLink = `https://t.me/${config.bot.username}?startapp=room_${groupId}`;
            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('▶️ Play', 'play'),
                    Markup.button.callback('⏸ Pause', 'pause'),
                    Markup.button.callback('⏭ Skip', 'skip')
                ],
                [Markup.button.url('🎧 Open Player', deepLink)]
            ]);

            // Use original JioSaavn thumbnail directly
            const sentMsg = await this.bot.telegram.sendPhoto(groupId,
                song.thumbnail || undefined,
                {
                    caption: caption,
                    parse_mode: 'Markdown',
                    ...keyboard
                }
            );

            // Auto-delete after 10 seconds
            setTimeout(() => {
                this.bot.telegram.deleteMessage(groupId, sentMsg.message_id).catch(() => { });
            }, 10000);

            logger.info('now_playing_notification_sent', { groupId, songTitle: song.title });
        } catch (e) {
            console.error('[TelegramService] Error sending now playing notification:', e);
            logger.error('now_playing_notification_error', { error: e.message, groupId });
        }
    }

    /**
     * Send join/leave notification
     */
    async sendJoinLeaveNotification(groupId, user, action) {
        try {
            // Skip Telegram notifications for private rooms (they don't have a Telegram chat)
            if (groupId && groupId.toString().startsWith('private_')) {
                return;
            }

            const userName = user.firstName || user.name || user.username || 'User';
            const emoji = action === 'join' ? '🟢' : '🔴';
            const actionText = action === 'join' ? 'joined' : 'left';
            const message = `${emoji} *${userName}* ${actionText} the player`;

            const config = require('../config');
            const deepLink = `https://t.me/${config.bot.username}?startapp=room_${groupId}`;

            let sentMsg;
            if (action === 'join') {
                // Send text message with Join Player button
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🎧 Join Player', url: deepLink }
                        ]]
                    }
                });
            } else {
                // Send simple text message for leave
                sentMsg = await this.bot.telegram.sendMessage(groupId, message, {
                    parse_mode: 'Markdown'
                });
            }

            // Auto-delete after 10 seconds
            setTimeout(() => {
                this.bot.telegram.deleteMessage(groupId, sentMsg.message_id).catch(() => { });
            }, 10000);
        } catch (e) {
            console.error('[TelegramService] Error sending join/leave notification:', e);
        }
    }

    /**
     * Send message to logger group
     */
    async sendToLoggerGroup(message, photoUrl = null, buttons = []) {
        if (!config.bot.loggerGroupId) return;
        try {
            const keyboard = buttons.length > 0 ? Markup.inlineKeyboard(buttons) : null;

            // Try sending with photo first if photoUrl is provided
            if (photoUrl) {
                try {
                    await this.bot.telegram.sendPhoto(config.bot.loggerGroupId, photoUrl, {
                        caption: message,
                        parse_mode: 'Markdown',
                        ...(keyboard ? keyboard : {})
                    });
                    return; // Success, exit early
                } catch (photoError) {
                    // Photo failed, fall back to text-only message
                    console.error('[TelegramService] Photo send failed, falling back to text:', photoError.message);
                }
            }

            // Send text-only message (either no photo provided or photo failed)
            await this.bot.telegram.sendMessage(config.bot.loggerGroupId, message, {
                parse_mode: 'Markdown',
                ...(keyboard ? keyboard : {})
            });
        } catch (e) {
            console.error('[TelegramService] Error sending to logger group:', e.message);
        }
    }
}

module.exports = new TelegramService();
