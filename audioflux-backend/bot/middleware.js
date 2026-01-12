/**
 * Bot Middleware
 * Separate middleware file for better organization
 */

const telegramService = require('../services/telegramService');
const banService = require('../services/banService');
const { LForUser } = require('../config/languages');
const config = require('../config');
const { SUPPORT_CHANNEL_HANDLE, SUPPORT_CHAT_HANDLE } = require('../utils/helpers');

const bot = telegramService.getBot();

// Cooldown map to prevent spam warnings for unapproved chats
// Format: { chatId: lastWarningTimestamp }
const unapprovedChatWarnings = new Map();

// Ban check middleware - MUST RUN FIRST before auto-delete
bot.use(async (ctx, next) => {
    try {
        const userId = ctx.from?.id;
        if (!userId) return next();

        // Only check ban on commands, not regular messages
        const isCommand = ctx.message?.text?.startsWith('/');
        if (!isCommand) return next();

        const banInfo = await banService.isUserBanned(userId);

        if (banInfo) {
            console.log(`[Middleware] Blocked banned user command: ${userId}`);

            // Delete the command
            try {
                await ctx.deleteMessage();
            } catch (e) {
                // Ignore if we can't delete
            }

            // Send ban notification
            const msg = await ctx.reply(
                `🚫 *You are banned from using this bot*\n\n` +
                `📝 *Reason:* ${banInfo.reason}\n` +
                `⏰ *Banned on:* ${new Date(banInfo.bannedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
                `💬 *Need help?* Contact support`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💬 Support Chat', url: config.bot.supportChat || 'https://t.me' }]
                        ]
                    }
                }
            );

            // Auto-delete ban message after 30 seconds
            setTimeout(() => {
                ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id).catch(() => { });
            }, 30000);

            await banService.logActivity('user', userId, 'blocked_attempt', { reason: 'banned' });
            return; // Stop here, don't continue
        }

        return next();
    } catch (error) {
        console.error('[Middleware] Error in ban check:', error);
        return next();
    }
});

// Auto-delete command messages middleware - runs AFTER ban check
bot.use(async (ctx, next) => {
    try {
        // Delete command message if it's a command
        if (ctx.message?.text?.startsWith('/')) {
            // Don't delete owner commands in private chat
            const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
            const isOwner = ctx.from?.id === OWNER_ID;
            const isPrivate = ctx.chat?.type === 'private';

            // Skip deletion for owner in DM
            if (!(isOwner && isPrivate)) {
                try {
                    await ctx.deleteMessage();
                } catch (e) {
                    // Ignore if we can't delete (permissions, etc.)
                }
            }
        }
        return next();
    } catch (error) {
        console.error('[Middleware] Error in auto-delete:', error);
        return next();
    }
});

// Chat approval middleware - check if chat is banned or not approved
bot.use(async (ctx, next) => {
    try {
        // Skip for private chats
        if (ctx.chat?.type === 'private') return next();

        const chatId = ctx.chat?.id?.toString();
        if (!chatId) return next();

        // Skip for logger group
        if (chatId === process.env.LOGGER_GROUP_ID) return next();

        // Only check on commands (to avoid checking every message)
        const isCommand = ctx.message?.text?.startsWith('/');
        if (!isCommand) return next();

        // Check if chat is banned
        const banInfo = await banService.isChatBanned(chatId);
        if (banInfo) {
            console.log(`[Middleware] Blocked banned chat: ${chatId}`);

            const msg = await ctx.reply(
                `🚫 *This group is banned from using this bot*\n\n` +
                `📝 *Reason:* ${banInfo.reason}\n` +
                `⏰ *Banned on:* ${new Date(banInfo.bannedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
                `💬 *Need help?* Contact support`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💬 Support Chat', url: config.bot.supportChat || 'https://t.me' }]
                        ]
                    }
                }
            );

            // Auto-delete after 30 seconds
            setTimeout(() => {
                ctx.telegram.deleteMessage(chatId, msg.message_id).catch(() => { });
            }, 30000);

            await banService.logActivity('chat', chatId, 'blocked_attempt', { reason: 'banned' });
            return; // Block silently
        }

        // Check if chat is approved - ONLY FOR COMMANDS
        // Regular messages are allowed even in unapproved chats
        const isCommandForApproval = ctx.message?.text?.startsWith('/');

        if (isCommandForApproval) {
            const approvalInfo = await banService.isChatApproved(chatId);

            if (!approvalInfo) {
                console.log(`[Middleware] Blocked command in unapproved chat: ${chatId}`);

                // Check cooldown - only send warning once per hour
                const now = Date.now();
                const lastWarning = unapprovedChatWarnings.get(chatId);
                const cooldownPeriod = 60 * 60 * 1000; // 1 hour in milliseconds

                if (!lastWarning || (now - lastWarning) > cooldownPeriod) {
                    // Send warning message
                    const { Markup } = require('telegraf');

                    // Helper to format Telegram URL
                    const formatTgUrl = (handle) => {
                        if (!handle) return 'https://t.me';
                        if (handle.startsWith('http')) return handle;
                        const username = handle.replace('@', '');
                        return `https://t.me/${username}`;
                    };

                    const warningMessage =
                        `⚠️ *GROUP NOT APPROVED*\n\n` +
                        `This bot only works in approved groups.\n\n` +
                        `📋 *To get approval:*\n` +
                        `1. Contact support\n` +
                        `2. Provide group details\n` +
                        `3. Wait for admin approval\n\n` +
                        `🆔 *Group ID:* \`${chatId}\`\n` +
                        `📊 *Group Name:* ${ctx.chat.title}\n\n` +
                        `_Commands will not work until approved._`;

                    const keyboard = Markup.inlineKeyboard([
                        [Markup.button.url('💬 Contact Support', formatTgUrl(config.bot.supportChat))],
                        [Markup.button.url('📢 Support Channel', formatTgUrl(config.bot.supportChannel))]
                    ]);

                    const msg = await ctx.reply(warningMessage, {
                        parse_mode: 'Markdown',
                        ...keyboard
                    });

                    // Auto-delete after 30 seconds
                    setTimeout(() => {
                        ctx.telegram.deleteMessage(chatId, msg.message_id).catch(() => { });
                    }, 30000);

                    // Update cooldown timestamp
                    unapprovedChatWarnings.set(chatId, now);

                    await banService.logActivity('chat', chatId, 'unapproved_command_attempt', {
                        chatTitle: ctx.chat.title,
                        command: ctx.message.text
                    });
                }

                return; // Block command - don't continue to next middleware
            }
        }

        return next();
    } catch (error) {
        console.error('[Middleware] Error in chat approval check:', error);
        return next();
    }
});

// Force-join channel middleware (for support chat)
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
                console.error('[Bot Middleware] force-join check error:', e.message);
                // if check fails, allow message
            }
        }
    } catch (e) {
        console.error('[Bot Middleware] force-join middleware error:', e.message);
    }
    return next();
});

console.log('[Bot] Middleware loaded');

module.exports = bot;
