/**
 * Bot Callbacks - Complete Implementation
 * All callback handlers from the original slterver.js
 */

const { Markup } = require('telegraf');
const telegramService = require('../services/telegramService');
const { LForUser, setUserLanguage } = require('../config/languages');
const permissionService = require('../services/permissionService');
const config = require('../config');

const bot = telegramService.getBot();

// Language selection
bot.action('set_lang', async (ctx) => {
    const msg = ctx.callbackQuery.message;
    const L = LForUser(ctx.from.id);

    const keyboard = {
        inline_keyboard: [
            [{ text: '🇬🇧 English', callback_data: 'lang_en' }],
            [{ text: '🇮🇳 हिन्दी', callback_data: 'lang_hi' }],
            [{ text: L.back, callback_data: 'help_main' }]
        ]
    };

    try {
        if (msg && msg.photo) {
            await ctx.editMessageCaption('🌐 Select Language / भाषा चुनें:', {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await ctx.editMessageText('🌐 Select Language / भाषा चुनें:', {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    } catch (err) {
        console.log("LANG EDIT ERROR:", err.message);
    }
});

bot.action('lang_en', async (ctx) => {
    setUserLanguage(ctx.from.id, 'en');
    await ctx.answerCbQuery('Language set: English');
    await updateStartMenu(ctx);
});

bot.action('lang_hi', async (ctx) => {
    setUserLanguage(ctx.from.id, 'hi');
    await ctx.answerCbQuery('भाषा सेट: हिन्दी');
    await updateStartMenu(ctx);
});

async function updateStartMenu(ctx) {
    const L = LForUser(ctx.from.id);
    const msg = ctx.callbackQuery?.message;

    const kb = {
        inline_keyboard: [
            [
                { text: L.btn_add_group, url: `https://t.me/${config.bot.username}?startgroup=new` },
                { text: L.btn_help, callback_data: 'help_main' }
            ],
            [
                { text: L.btn_updates, url: config.bot.supportChannel },
                { text: L.btn_support, url: config.bot.supportChat }
            ],
            [
                { text: L.btn_owner, url: `tg://user?id=${config.bot.ownerId}` }
            ],
            [
                { text: L.btn_lang, callback_data: 'set_lang' }
            ]
        ]
    };

    try {
        if (msg && msg.photo) {
            await ctx.editMessageCaption(L.start_caption_dm, {
                parse_mode: "Markdown",
                reply_markup: kb
            });
        } else {
            await ctx.editMessageText(L.start_caption_dm, {
                parse_mode: "Markdown",
                reply_markup: kb
            });
        }
    } catch (err) {
        console.log("updateStartMenu ERROR:", err.message);
    }
}

// Help system
bot.action('help_main', async (ctx) => {
    const uid = ctx.from.id;
    const L = LForUser(uid);

    let showPlayer = true;
    let showMod = false;
    let showOwner = false;
    let showActions = false;

    if (ctx.chat && ctx.chat.type !== 'private') {
        const chatId = ctx.chat.id.toString();
        const owner = await permissionService.isOwner(chatId, uid);
        const mod = await permissionService.isMod(chatId, uid);
        const approved = await permissionService.isApprovedUser(chatId, uid);

        showPlayer = true;
        showMod = mod || owner;
        showOwner = owner;
        showActions = approved || mod || owner;
    } else {
        showPlayer = showMod = showOwner = showActions = true;
    }

    const rows = [];
    const r1 = [];
    if (showPlayer) r1.push({ text: L.help_player, callback_data: 'help_player' });
    if (showMod) r1.push({ text: L.help_mod, callback_data: 'help_mod' });
    if (r1.length) rows.push(r1);

    const r2 = [];
    if (showOwner) r2.push({ text: L.help_owner, callback_data: 'help_owner' });
    if (showActions) r2.push({ text: L.help_actions, callback_data: 'help_actions' });
    if (r2.length) rows.push(r2);

    rows.push([{ text: L.back, callback_data: 'back_to_start' }]);
    await editHelpDynamic(ctx, L.help_title, { inline_keyboard: rows });
});

bot.action('help_player', async (ctx) => {
    const L = LForUser(ctx.from.id);
    await editHelpDynamic(
        ctx,
        `${L.play_help}\n\n${L.skip_help}`,
        {
            inline_keyboard: [
                [
                    { text: '▶️ Play Guide', callback_data: 'cmd_play' },
                    { text: '⏭ Skip Guide', callback_data: 'cmd_skip' }
                ],
                [{ text: L.back, callback_data: 'help_main' }]
            ]
        }
    );
});

bot.action('help_mod', async (ctx) => {
    const L = LForUser(ctx.from.id);
    await editHelpDynamic(
        ctx,
        L.mod_help,
        {
            inline_keyboard: [
                [{ text: L.back, callback_data: 'help_main' }]
            ]
        }
    );
});

bot.action('help_owner', async (ctx) => {
    const L = LForUser(ctx.from.id);
    await editHelpDynamic(
        ctx,
        L.owner_help,
        {
            inline_keyboard: [
                [{ text: L.back, callback_data: 'help_main' }]
            ]
        }
    );
});

bot.action('back_to_start', async (ctx) => {
    await updateStartMenu(ctx);
});

async function editHelpDynamic(ctx, text, keyboard) {
    const msg = ctx.callbackQuery?.message;
    if (!msg) return;
    try {
        if (msg.photo) {
            await ctx.editMessageCaption(text, {
                parse_mode: "Markdown",
                reply_markup: keyboard
            });
        } else {
            await ctx.editMessageText(text, {
                parse_mode: "Markdown",
                reply_markup: keyboard
            });
        }
    } catch (err) {
        console.log("editHelpDynamic ERROR:", err.message);
    }
}

// Playback control callbacks
const queueService = require('../services/queueService');
const logger = require('../logger');
const debugLog = require('../utils/debugLogger');

bot.action('play', async (ctx) => {
    debugLog.callback('play', ctx.from.id, ctx.chat.id);

    try {
        const groupId = ctx.chat.id.toString();
        const state = await queueService.getState(groupId);

        if (!state || !state.currentSong) {
            return ctx.answerCbQuery('⏸ Nothing to play', { show_alert: true });
        }

        state.playing = true;
        state.songStartedAt = Date.now() - ((state.currentTime || 0) * 1000);
        await queueService.setState(groupId, state);

        // Broadcast to socket
        if (global.io) {
            global.io.to(groupId).emit('stateChanged', state);
        }

        // Send notification
        await telegramService.sendActionNotification(groupId, 'play', {
            id: ctx.from.id,
            firstName: ctx.from.first_name,
            username: ctx.from.username
        });

        await ctx.answerCbQuery('▶️ Playing');
        logger.info('playback_play', { groupId, userId: ctx.from.id });
    } catch (e) {
        debugLog.error('Error in play callback', e);
        await ctx.answerCbQuery('❌ Error', { show_alert: true });
    }
});

bot.action('pause', async (ctx) => {
    debugLog.callback('pause', ctx.from.id, ctx.chat.id);

    try {
        const groupId = ctx.chat.id.toString();
        const state = await queueService.getState(groupId);

        if (!state || !state.currentSong) {
            return ctx.answerCbQuery('⏸ Nothing to pause', { show_alert: true });
        }

        state.playing = false;
        await queueService.setState(groupId, state);

        // Broadcast to socket
        if (global.io) {
            global.io.to(groupId).emit('stateChanged', state);
        }

        // Send notification
        await telegramService.sendActionNotification(groupId, 'pause', {
            id: ctx.from.id,
            firstName: ctx.from.first_name,
            username: ctx.from.username
        });

        await ctx.answerCbQuery('⏸ Paused');
        logger.info('playback_pause', { groupId, userId: ctx.from.id });
    } catch (e) {
        debugLog.error('Error in pause callback', e);
        await ctx.answerCbQuery('❌ Error', { show_alert: true });
    }
});

bot.action('skip', async (ctx) => {
    debugLog.callback('skip', ctx.from.id, ctx.chat.id);

    try {
        const groupId = ctx.chat.id.toString();
        const queue = await queueService.getQueue(groupId) || [];

        if (!queue.length) {
            return ctx.answerCbQuery('📭 Queue is empty', { show_alert: true });
        }

        // Remove first song
        queue.shift();
        await queueService.setQueue(groupId, queue);

        // Update state with new song
        const state = await queueService.getState(groupId) || {};
        state.currentSong = queue[0] || null;
        state.currentTime = 0;
        state.songStartedAt = Date.now();

        await queueService.setState(groupId, state);

        // Broadcast updates
        if (global.io) {
            global.io.to(groupId).emit('queueUpdated', queue);
            global.io.to(groupId).emit('stateChanged', state);
        }

        // Send notification
        await telegramService.sendActionNotification(groupId, 'skip', {
            id: ctx.from.id,
            firstName: ctx.from.first_name,
            username: ctx.from.username
        });

        // Send now playing notification
        if (queue[0]) {
            await telegramService.sendNowPlayingNotification(groupId, queue[0]);
        }

        await ctx.answerCbQuery('⏭ Skipped');
        logger.info('playback_skip', { groupId, userId: ctx.from.id });
    } catch (e) {
        debugLog.error('Error in skip callback', e);
        await ctx.answerCbQuery('❌ Error', { show_alert: true });
    }
});

bot.action('open_player', async (ctx) => {
    debugLog.callback('open_player', ctx.from.id, ctx.chat.id);

    try {
        const chat = ctx.chat || (ctx.callbackQuery.message && ctx.callbackQuery.message.chat);
        if (!chat) return ctx.answerCbQuery('No chat context');

        const groupId = chat.id.toString();
        const uid = ctx.from.id;
        const username = ctx.from.username || `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

        logger.info('player_button_clicked', { userId: uid, groupId, username });
        debugLog.bot('Player button clicked', { userId: uid, username, groupId });

        // Check if there's a song playing or in queue
        const state = await queueService.getState(groupId);
        const queue = await queueService.getQueue(groupId);

        if (!state.currentSong && (!queue || queue.length === 0)) {
            return ctx.answerCbQuery('⏸ No music playing! Add a song first.', { show_alert: true });
        }

        // Answer callback and tell user to use /player command
        await ctx.answerCbQuery('💡 Use /player command to get the player link!', { show_alert: true });

        logger.info('player_opened', { groupId, userId: uid });
    } catch (e) {
        debugLog.error('Error in open_player callback', e);
        await ctx.answerCbQuery('❌ Error opening player', { show_alert: true });
    }
});

bot.action('refresh_queue', async (ctx) => {
    debugLog.callback('refresh_queue', ctx.from.id, ctx.chat.id);

    try {
        const msg = ctx.callbackQuery.message;
        if (!msg) return ctx.answerCbQuery('No message context');

        const groupId = msg.chat.id.toString();
        const queue = await queueService.getQueue(groupId);

        if (!queue || !queue.length) {
            await ctx.answerCbQuery('Queue is empty');
            try {
                await ctx.editMessageText('📭 Queue is empty.', {
                    reply_markup: {
                        inline_keyboard: [[{ text: '🎧 Player', callback_data: 'open_player' }]]
                    }
                });
            } catch { }
            return;
        }

        const text = queue
            .map((s, i) => `${i + 1}. ${s.title} — ${s.addedBy?.name || s.addedBy || 'unknown'}`)
            .slice(0, 30)
            .join('\n');

        try {
            await ctx.editMessageText(`📜 *Current Queue:*\n${text}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Refresh Queue', callback_data: 'refresh_queue' }],
                        [{ text: '🎧 Player', callback_data: 'open_player' }]
                    ]
                }
            });

            await ctx.answerCbQuery('🔄 Queue refreshed');
        } catch (editError) {
            if (editError.description && editError.description.includes('message is not modified')) {
                await ctx.answerCbQuery('✅ Queue is already up to date');
            } else {
                throw editError;
            }
        }
    } catch (e) {
        debugLog.error('Error in refresh_queue callback', e);
        try { await ctx.answerCbQuery('❌ Error refreshing queue'); } catch { }
    }
});

// Owner menu callbacks
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');

bot.action('owner_music', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    const text = `🎵 <b>Music Commands</b>\n\n` +
        `/play &lt;song&gt; - Auto-play best match\n` +
        `/mplay &lt;song&gt; - Choose from 5 options\n` +
        `/queue - Show current queue\n` +
        `/skip - Skip current song\n` +
        `/pause - Pause playback\n` +
        `/resume - Resume playback\n` +
        `/player - Open web player\n` +
        `/lyrics - Get song lyrics`;

    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '« Back', callback_data: 'owner_back' }]] }
    });
    await ctx.answerCbQuery();
});

bot.action('owner_ban', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    const text = `🚫 <b>Ban &amp; Approval Commands</b>\n\n` +
        `/banuser &lt;id&gt; [reason] - Ban a user\n` +
        `/unbanuser &lt;id&gt; - Unban a user\n` +
        `/banchat &lt;id&gt; [reason] - Ban a chat\n` +
        `/unbanchat &lt;id&gt; - Unban a chat\n` +
        `/approvechat &lt;id&gt; [title] - Approve chat\n` +
        `/unapprovechat &lt;id&gt; - Unapprove chat\n` +
        `/listbans - List all bans\n` +
        `/listapproved - List approved chats`;

    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '« Back', callback_data: 'owner_back' }]] }
    });
    await ctx.answerCbQuery();
});

bot.action('owner_stats', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    const text = `📊 <b>Stats &amp; Info Commands</b>\n\n` +
        `/stats - Complete bot statistics\n` +
        `/userstats &lt;user_id&gt; - View user song play stats\n` +
        `/id - Get group &amp; user IDs (groups only)\n` +
        `/info &lt;user|chat&gt; &lt;id&gt; - Check ban/approval status\n` +
        `/gethistory &lt;user|chat&gt; &lt;id&gt; - Get activity history\n` +
        `/speedtest - Test server network speed\n` +
        `/reboot - Restart server/app\n\n` +
        `<i>Use /id in a group to get IDs quickly!</i>`;

    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '« Back', callback_data: 'owner_back' }]] }
    });
    await ctx.answerCbQuery();
});

bot.action('owner_broadcast', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    const text = `📢 <b>Broadcast Commands</b>\n\n` +
        `/broadcast &lt;msg&gt; - Broadcast to all users\n` +
        `/broadcastgroups &lt;msg&gt; - Broadcast to groups\n\n` +
        `<i>⚠️ Use carefully! Sends to ALL users/groups.</i>`;

    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '« Back', callback_data: 'owner_back' }]] }
    });
    await ctx.answerCbQuery();
});

bot.action('owner_settings', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    const text = `⚙️ <b>Environment Settings</b>\n\n` +
        `<b>OWNER_ID</b>\n` +
        `Your user ID (required for owner commands)\n\n` +
        `<b>REQUIRE_CHAT_APPROVAL</b>\n` +
        `Set to 'true' to enable approval system\n` +
        `Bot will only work in approved groups\n\n` +
        `<b>LOGGER_GROUP_ID</b>\n` +
        `Group ID for logging all bot activities`;

    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '« Back', callback_data: 'owner_back' }]] }
    });
    await ctx.answerCbQuery();
});

bot.action('owner_all', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    const text = `📋 <b>All Owner Commands</b>\n\n` +
        `<b>Music:</b> /play /mplay /queue /skip /pause /resume /player /lyrics\n\n` +
        `<b>Ban:</b> /banuser /unbanuser /banchat /unbanchat /approvechat /unapprovechat /listbans /listapproved\n\n` +
        `<b>Rate Limiting:</b> /free /limit\n\n` +
        `<b>Notifications:</b> /notify /listnotifications /deletenotification /clearnotifications\n\n` +
        `<b>Info:</b> /stats /id /info /gethistory /speedtest /reboot\n\n` +
        `<b>Broadcast:</b> /broadcast /broadcastgroups`;

    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '« Back', callback_data: 'owner_back' }]] }
    });
    await ctx.answerCbQuery();
});

bot.action('owner_back', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    const text = `👑 <b>OWNER CONTROL PANEL</b>\n\n` +
        `Use the buttons below to access different sections:`;

    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🎵 Music Commands', callback_data: 'owner_music' },
                    { text: '🚫 Ban & Approval', callback_data: 'owner_ban' }
                ],
                [
                    { text: '📊 Stats & Info', callback_data: 'owner_stats' },
                    { text: '📢 Broadcast', callback_data: 'owner_broadcast' }
                ],
                [
                    { text: '⚙️ Settings', callback_data: 'owner_settings' },
                    { text: '📋 All Commands', callback_data: 'owner_all' }
                ]
            ]
        }
    });
    await ctx.answerCbQuery();
});

// Private room invite link callback
bot.action(/^get_invite_(.+)$/, async (ctx) => {
    try {
        const roomId = ctx.match[1];
        const inviteLink = `https://t.me/${config.bot.username}?start=room_${roomId}`;

        await ctx.answerCbQuery('📋 Invite link copied!');

        await ctx.reply(
            `🔗 *Private Room Invite Link*\n\n` +
            `Share this link with friends to invite them to your private room:\n\n` +
            `\`${inviteLink}\`\n\n` +
            `⚠️ *Note:* They must join the support channel to access the room.`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 Share Link', url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('🎵 Join my private music room!')}` }]
                    ]
                }
            }
        );
    } catch (e) {
        console.error('[Bot] Error in get_invite callback:', e);
        await ctx.answerCbQuery('❌ Error generating invite link', { show_alert: true });
    }
});

// Room info callback
bot.action('room_info', async (ctx) => {
    try {
        const uid = ctx.from.id;
        const redis = require('../redis');

        // Get user's room
        const userRoom = await redis.getUserRoom(uid);
        if (!userRoom) {
            return ctx.answerCbQuery('❗ Room not found', { show_alert: true });
        }

        // Get room metadata
        const roomMeta = await redis.getRoomMetadata(userRoom);
        if (!roomMeta) {
            return ctx.answerCbQuery('❌ Room metadata not found', { show_alert: true });
        }

        // Get room stats
        const memberCount = await redis.getRoomMemberCount(userRoom);
        const blockedCount = (await redis.getBlockedUsers(userRoom)).length;
        const inviteVersion = roomMeta.inviteVersion || 0;
        const createdDate = new Date(roomMeta.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        await ctx.answerCbQuery();

        await ctx.reply(
            `🔒 *Private Room Info*\n\n` +
            `👤 *Owner:* ${roomMeta.ownerName}\n` +
            `🆔 *Room ID:* \`${userRoom}\`\n` +
            `📅 *Created:* ${createdDate}\n\n` +
            `📊 *Statistics:*\n` +
            `👥 Members Joined: ${memberCount}\n` +
            `🚫 Blocked Users: ${blockedCount}\n` +
            `🔢 Invite Version: ${inviteVersion}\n\n` +
            `💡 Use /roominfo for more details`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[Bot] Error in room_info callback:', e);
        await ctx.answerCbQuery('❌ Error loading room info', { show_alert: true });
    }
});

console.log('[Bot] ✅ Callbacks module loaded with all playback controls');

module.exports = bot;
