/**
 * Bot Events and Middleware
 * Event handlers and middleware from the original slterver.js
 */

const telegramService = require('../services/telegramService');
const { LForUser } = require('../config/languages');
const config = require('../config');
const { client } = require('../redis');
const logger = require('../logger');
const { SUPPORT_CHANNEL_HANDLE, SUPPORT_CHAT_HANDLE } = require('../utils/helpers');

const bot = telegramService.getBot();

// Import logger functions
const { logBotAddedToGroup, logBotRemovedFromGroup } = require('../utils/loggerFunctions');

// Force-join channel middleware
bot.on('message', async (ctx, next) => {
    try {
        // Only if support chat + we have channel handle
        if (
            SUPPORT_CHANNEL_HANDLE &&
            SUPPORT_CHAT_HANDLE &&
            ctx.chat.type !== 'private' &&
            ctx.chat.username &&
            ('@' + ctx.chat.username) === SUPPORT_CHAT_HANDLE &&
            !ctx.message.new_chat_members && !ctx.message.left_chat_member
        ) {
            try {
                const member = await ctx.telegram.getChatMember(SUPPORT_CHANNEL_HANDLE, ctx.from.id);
                const allowedStatuses = ['creator', 'administrator', 'member'];
                if (!member || !allowedStatuses.includes(member.status)) {
                    // user NOT in channel -> delete message & ask to join
                    try { await ctx.deleteMessage(); } catch { }
                    const L = LForUser(ctx.from.id);
                    const warningMsg = await ctx.reply(
                        `⚠️ To chat here, you must join our updates channel first.`,
                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '📢 Join Updates', url: config.bot.supportChannel }],
                                    [{ text: L.back, callback_data: 'help_main' }]
                                ]
                            }
                        }
                    );

                    setTimeout(() => {
                        ctx.telegram.deleteMessage(ctx.chat.id, warningMsg.message_id).catch(() => { });
                    }, 30000);

                    return; // do not pass to next handlers
                }
            } catch (e) {
                console.error('force-join check error:', e.message);
                // if check fails, allow message
            }
        }
    } catch (e) {
        console.error('force-join middleware error:', e.message);
    }
    return next();
});

// "Daddy is back!" - When owner joins a group where bot is present
bot.on('new_chat_members', async (ctx) => {
    try {
        const botId = ctx.botInfo && ctx.botInfo.id;
        const added = ctx.message.new_chat_members || [];

        // Check if owner joined (not the bot)
        const ownerJoined = added.find((m) => m.id.toString() === process.env.OWNER_ID);

        if (ownerJoined) {
            const daddyImage = process.env.DADDY_IMAGE || process.env.START_IMAGE;
            const message = '👑 *Daddy is back!* 🔥';

            try {
                if (daddyImage) {
                    // Check if it's a GIF (use animation method for better support)
                    const isGif = daddyImage.toLowerCase().endsWith('.gif');

                    if (isGif) {
                        await ctx.replyWithAnimation(daddyImage, {
                            caption: message,
                            parse_mode: 'Markdown'
                        });
                    } else {
                        await ctx.replyWithPhoto(daddyImage, {
                            caption: message,
                            parse_mode: 'Markdown'
                        });
                    }
                } else {
                    await ctx.reply(message, { parse_mode: 'Markdown' });
                }
                console.log(`[Bot] Owner joined group: ${ctx.chat.title}`);
            } catch (e) {
                console.error('[Bot] Error sending daddy message:', e.message);
            }
            return; // Don't send welcome message for owner
        }

        // Check if bot was added
        const addedBot = added.find((m) => m.id === botId);
        if (!addedBot) return;

        const chatId = ctx.chat.id.toString();
        const key = `welcomed_group:${chatId}`;
        const already = await client.get(key);
        if (already) return;
        await client.set(key, '1');

        // Log bot added to group
        await logBotAddedToGroup(chatId, ctx.chat.title, ctx.from);

        await ctx.reply(
            '🎧 Thanks for adding me!\nUse /play <song> to start music, /queue for playlist, and /player to open the synced web player for this group.'
        );
    } catch (e) {
        console.error('welcome handler error:', e.message);
    }
});

// Handle bot being removed from group
bot.on('my_chat_member', async (ctx) => {
    try {
        const { old_chat_member, new_chat_member } = ctx.myChatMember;

        // Check if bot was ADDED to group
        if (
            new_chat_member &&
            ['member', 'administrator'].includes(new_chat_member.status) &&
            (!old_chat_member || ['left', 'kicked'].includes(old_chat_member.status))
        ) {
            const chatId = ctx.chat.id.toString();
            const chatTitle = ctx.chat.title;

            console.log(`[Bot] Added to group: ${chatTitle} (${chatId})`);

            // Check if group is approved
            const isApproved = await banService.isChatApproved(chatId);

            if (!isApproved) {
                // Group is NOT approved - send warning
                const config = require('../config');
                const { Markup } = require('telegraf');

                const warningMessage =
                    `⚠️ *GROUP NOT APPROVED*\n\n` +
                    `This group is not authorized to use AudioFlux bot.\n\n` +
                    `📋 *To get approval:*\n` +
                    `1. Contact support\n` +
                    `2. Provide group details\n` +
                    `3. Wait for admin approval\n\n` +
                    `🆔 *Group ID:* \`${chatId}\`\n` +
                    `📊 *Group Name:* ${chatTitle}\n\n` +
                    `_The bot will not respond to commands until approved._`;

                // Helper to format Telegram URL
                const formatTgUrl = (handle) => {
                    if (!handle) return 'https://t.me';
                    if (handle.startsWith('http')) return handle;
                    const username = handle.replace('@', '');
                    return `https://t.me/${username}`;
                };

                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.url('💬 Contact Support', formatTgUrl(config.bot.supportChat))],
                    [Markup.button.url('📢 Support Channel', formatTgUrl(config.bot.supportChannel))]
                ]);

                // Send warning with image if available
                if (config.bot.startImage) {
                    await ctx.replyWithPhoto(config.bot.startImage, {
                        caption: warningMessage,
                        parse_mode: 'Markdown',
                        ...keyboard
                    });
                } else {
                    await ctx.reply(warningMessage, {
                        parse_mode: 'Markdown',
                        ...keyboard
                    });
                }

                logger.info('bot_added_to_unapproved_group', {
                    chatId,
                    chatTitle
                });
            } else {
                logger.info('bot_added_to_approved_group', {
                    chatId,
                    chatTitle
                });
            }
        }

        // Check if bot was REMOVED (kicked or left)
        if (
            old_chat_member &&
            new_chat_member &&
            ['member', 'administrator'].includes(old_chat_member.status) &&
            ['left', 'kicked'].includes(new_chat_member.status)
        ) {
            const chatId = ctx.chat.id.toString();
            const removedBy = ctx.from;

            console.log(`[Bot] Removed from group: ${ctx.chat.title} (${chatId})`);

            // Log bot removal to logger group
            await logBotRemovedFromGroup(chatId, ctx.chat.title, removedBy);

            logger.info('bot_removed_from_group', {
                chatId,
                chatTitle: ctx.chat.title,
                removedBy: removedBy.id
            });
        }
    } catch (e) {
        console.error('my_chat_member handler error:', e.message);
    }
});

console.log('[Bot] Events and middleware loaded');

module.exports = bot;

