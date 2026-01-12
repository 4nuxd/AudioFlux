/**
 * Premium Help System
 * Professional categorized help menus for owner vs normal users
 */

const telegramService = require('../services/telegramService');
const config = require('../config');
const { Markup } = require('telegraf');

const bot = telegramService.getBot();
const START_IMAGE = process.env.START_IMAGE;

// Help command with categorized menus
bot.command('help', async (ctx) => {
    try {
        const uid = ctx.from.id;
        const isOwner = uid.toString() === config.bot.ownerId;

        try { await ctx.deleteMessage(); } catch { }

        if (isOwner) {
            // PREMIUM OWNER HELP MENU
            const caption =
                `👑 *AUDIOFLUX OWNER PANEL*\n\n` +
                `Welcome to the premium control center.\n` +
                `Select a category to view detailed commands:\n\n` +
                `🎵 Music & Playback\n` +
                `📊 Analytics & Monitoring\n` +
                `👥 User & Chat Management\n` +
                `⚙️ System & Server Control\n` +
                `🔒 Private Rooms\n` +
                `☁️ Infrastructure & DevOps`;

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('🎵 Music', 'help_music'),
                    Markup.button.callback('📊 Analytics', 'help_analytics')
                ],
                [
                    Markup.button.callback('👥 Users & Chats', 'help_users'),
                    Markup.button.callback('⚙️ System', 'help_system')
                ],
                [
                    Markup.button.callback('🔒 Private Rooms', 'help_rooms'),
                    Markup.button.callback('☁️ Infrastructure', 'help_infra')
                ],
                [
                    Markup.button.callback('💻 Server Commands', 'help_server'),
                    Markup.button.callback('🛠 Utilities', 'help_utils')
                ],
                [
                    Markup.button.callback('📋 Playlist', 'help_playlist')
                ]
            ]);

            if (START_IMAGE) {
                await ctx.replyWithPhoto(START_IMAGE, {
                    caption: caption,
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            } else {
                await ctx.reply(caption, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }
        } else {
            // CLEAN USER HELP MENU
            const caption =
                `🎵 *AUDIOFLUX HELP*\n\n` +
                `Welcome to AudioFlux!\n` +
                `Choose a category to get started:`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🎵 Music Commands', 'help_music')],
                [Markup.button.callback('🔒 Private Room', 'help_rooms')],
                [Markup.button.callback('📋 My Playlist', 'help_playlist')]
            ]);

            if (START_IMAGE) {
                await ctx.replyWithPhoto(START_IMAGE, {
                    caption: caption,
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            } else {
                await ctx.reply(caption, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
            }
        }
    } catch (e) {
        console.error('[Help] Error in /help command:', e);
    }
});

// Music commands help
bot.action('help_music', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `🎵 *MUSIC COMMANDS*\n\n` +
        `*🎧 Playback:*\n` +
        `/play <song> - Auto-play best match\n` +
        `/mplay <song> - Choose from results\n` +
        `/pause - Pause current song\n` +
        `/resume - Resume playback\n` +
        `/skip - Skip to next song\n` +
        `/skipall - Clear entire queue\n` +
        `/previous - Play previous song\n\n` +
        `*📋 Queue:*\n` +
        `/queue - View current queue\n` +
        `/np - Now playing info\n` +
        `/player - Open web player\n\n` +
        `*🔄 Controls:*\n` +
        `/loop - Toggle loop mode\n` +
        `/apon - Enable auto-play\n` +
        `/apoff - Disable auto-play`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// Analytics & Monitoring (Owner only)
bot.action('help_analytics', async (ctx) => {
    const uid = ctx.from.id;
    if (uid.toString() !== config.bot.ownerId) {
        return ctx.answerCbQuery('❌ Owner only', { show_alert: true });
    }

    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `📊 *ANALYTICS & MONITORING*\n\n` +
        `*📈 Statistics:*\n` +
        `/stats - Interactive stats dashboard\n` +
        `  • Users & Groups\n` +
        `  • Private Rooms\n` +
        `  • Analytics\n` +
        `  • System Info\n` +
        `  • Performance\n` +
        `  • Heroku Health\n\n` +
        `*🔍 Detailed Analytics:*\n` +
        `/owneranalytics - Deep dive analytics\n` +
        `/roomanalytics - Private room stats\n` +
        `/useranalytics - User behavior data\n\n` +
        `*⚡ Performance:*\n` +
        `/speedtest - Network speed test\n` +
        `/logs - Recent activity logs`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// User & Chat Management (Owner only)
bot.action('help_users', async (ctx) => {
    const uid = ctx.from.id;
    if (uid.toString() !== config.bot.ownerId) {
        return ctx.answerCbQuery('❌ Owner only', { show_alert: true });
    }

    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `👥 *USER & CHAT MANAGEMENT*\n\n` +
        `*🚫 Ban System:*\n` +
        `/banuser <id> - Ban user globally\n` +
        `/unbanuser <id> - Unban user\n` +
        `/banchat <id> - Ban entire chat\n` +
        `/unbanchat <id> - Unban chat\n\n` +
        `*✅ Approval System:*\n` +
        `/approve <id> - Approve user\n` +
        `/unapprove <id> - Remove approval\n` +
        `/approvechat <id> - Approve chat\n` +
        `/unapprovechat <id> - Remove approval\n\n` +
        `*👮 Moderators:*\n` +
        `/addmod <id> - Add moderator\n` +
        `/removemod <id> - Remove moderator\n\n` +
        `*📢 Communication:*\n` +
        `/broadcast <msg> - Send to all users\n` +
        `/deletenotification <id> - Delete notification`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// System & Server Control (Owner only)
bot.action('help_system', async (ctx) => {
    const uid = ctx.from.id;
    if (uid.toString() !== config.bot.ownerId) {
        return ctx.answerCbQuery('❌ Owner only', { show_alert: true });
    }

    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `⚙️ *SYSTEM & SERVER CONTROL*\n\n` +
        `*🔄 Bot Management:*\n` +
        `/reboot - Restart bot process\n` +
        `/maintenance - Toggle maintenance mode\n` +
        `/clearcache - Clear Redis cache\n\n` +
        `*🗄 Database:*\n` +
        `/backup - Backup database\n` +
        `/restore - Restore from backup\n\n` +
        `*👑 Ownership:*\n` +
        `/setowner <id> - Transfer ownership\n\n` +
        `*📝 Logs:*\n` +
        `/errorlogs - View error logs\n` +
        `/accesslogs - View access logs`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// Private Rooms
bot.action('help_rooms', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `🔒 *PRIVATE ROOM COMMANDS*\n\n` +
        `*📊 Room Info:*\n` +
        `/roominfo - View room statistics\n` +
        `/revokeinvite - Generate new invite link\n\n` +
        `*👥 User Management:*\n` +
        `/block <user_id> - Block user from room\n` +
        `/unblock <user_id> - Unblock user\n` +
        `/blocklist - View blocked users\n\n` +
        `*💡 Note:*\n` +
        `These commands only work in your\n` +
        `private room (DM with bot)`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// Infrastructure & DevOps (Owner only)
bot.action('help_infra', async (ctx) => {
    const uid = ctx.from.id;
    if (uid.toString() !== config.bot.ownerId) {
        return ctx.answerCbQuery('❌ Owner only', { show_alert: true });
    }

    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `☁️ *INFRASTRUCTURE & DEVOPS*\n\n` +
        `*📊 Heroku Monitoring:*\n` +
        `Access via /stats → Heroku Health\n` +
        `  • Backend app status\n` +
        `  • Frontend app status\n` +
        `  • Database & addons\n` +
        `  • Dyno metrics\n` +
        `  • Real-time health checks\n\n` +
        `*🔐 API Access:*\n` +
        `GET /health/heroku/summary\n` +
        `Requires: userId + token\n\n` +
        `*🌐 Endpoints:*\n` +
        `/health/heroku - Full status\n` +
        `/health/full - Complete health\n` +
        `/health/basic - Quick check`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// Server Commands (Owner only)
bot.action('help_server', async (ctx) => {
    const uid = ctx.from.id;
    if (uid.toString() !== config.bot.ownerId) {
        return ctx.answerCbQuery('❌ Owner only', { show_alert: true });
    }

    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `💻 *SERVER COMMANDS*\n\n` +
        `*🔧 Remote Execution:*\n` +
        `/cmd <command> - Execute shell command\n` +
        `/exec <command> - Alias for /cmd\n\n` +
        `*📋 Examples:*\n` +
        `\`/cmd ls -la\` - List files\n` +
        `\`/cmd pm2 status\` - PM2 status\n` +
        `\`/cmd df -h\` - Disk space\n` +
        `\`/cmd free -m\` - Memory usage\n` +
        `\`/cmd uptime\` - System uptime\n` +
        `\`/cmd ps aux\` - Running processes\n\n` +
        `*🔒 Security:*\n` +
        `• Dangerous commands blocked\n` +
        `• 30-second timeout\n` +
        `• Output truncation\n` +
        `• All commands logged\n\n` +
        `*📤 Output Format:*\n` +
        `JSON with execution time & status`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// Utilities (Owner only)
bot.action('help_utils', async (ctx) => {
    const uid = ctx.from.id;
    if (uid.toString() !== config.bot.ownerId) {
        return ctx.answerCbQuery('❌ Owner only', { show_alert: true });
    }

    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `🛠 *UTILITIES & TOOLS*\n\n` +
        `*🔍 Quick Actions:*\n` +
        `• View user info\n` +
        `• Check chat details\n` +
        `• Export data\n` +
        `• Generate reports\n\n` +
        `*🎯 Coming Soon:*\n` +
        `• Scheduled broadcasts\n` +
        `• Auto-moderation\n` +
        `• Custom commands\n` +
        `• Webhook integrations\n` +
        `• Advanced analytics\n` +
        `• Multi-language support`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// Playlist commands
bot.action('help_playlist', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(
        `📋 *PLAYLIST COMMANDS*\n\n` +
        `*🎵 Manage Your Playlist:*\n` +
        `/playlist - View your playlist\n` +
        `/addtoplaylist - Add current song\n` +
        `/removefromplaylist <num> - Remove song\n` +
        `/clearplaylist - Clear entire playlist\n\n` +
        `*💡 Note:*\n` +
        `Playlists are personal and saved per user`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Back to Menu', callback_data: 'help_main' }]
                ]
            }
        }
    );
});

// Back to main help menu
bot.action('help_main', async (ctx) => {
    const uid = ctx.from.id;
    const isOwner = uid.toString() === config.bot.ownerId;

    await ctx.answerCbQuery();

    if (isOwner) {
        const caption =
            `👑 *AUDIOFLUX OWNER PANEL*\n\n` +
            `Welcome to the premium control center.\n` +
            `Select a category to view detailed commands:\n\n` +
            `🎵 Music & Playback\n` +
            `📊 Analytics & Monitoring\n` +
            `👥 User & Chat Management\n` +
            `⚙️ System & Server Control\n` +
            `🔒 Private Rooms\n` +
            `☁️ Infrastructure & DevOps`;

        await ctx.editMessageCaption(caption, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🎵 Music', callback_data: 'help_music' },
                        { text: '📊 Analytics', callback_data: 'help_analytics' }
                    ],
                    [
                        { text: '👥 Users & Chats', callback_data: 'help_users' },
                        { text: '⚙️ System', callback_data: 'help_system' }
                    ],
                    [
                        { text: '🔒 Private Rooms', callback_data: 'help_rooms' },
                        { text: '☁️ Infrastructure', callback_data: 'help_infra' }
                    ],
                    [
                        { text: '💻 Server Commands', callback_data: 'help_server' },
                        { text: '🛠 Utilities', callback_data: 'help_utils' }
                    ],
                    [
                        { text: '📋 Playlist', callback_data: 'help_playlist' }
                    ]
                ]
            }
        });
    } else {
        const caption =
            `🎵 *AUDIOFLUX HELP*\n\n` +
            `Welcome to AudioFlux!\n` +
            `Choose a category to get started:`;

        await ctx.editMessageCaption(caption, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎵 Music Commands', callback_data: 'help_music' }],
                    [{ text: '🔒 Private Room', callback_data: 'help_rooms' }],
                    [{ text: '📋 My Playlist', callback_data: 'help_playlist' }]
                ]
            }
        });
    }
});

console.log('[Bot] ✅ Premium help system loaded');

module.exports = bot;
