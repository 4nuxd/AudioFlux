/**
 * Admin Commands for Ban & Approval System
 * /banuser, /unbanuser, /banchat, /unbanchat, /approvechat, /unapprovechat, /gethistory
 */

const telegramService = require('../services/telegramService');
const banService = require('../services/banService');
const config = require('../config');
const {
    logUserBanned,
    logUserUnbanned,
    logChatBanned,
    logChatUnbanned,
    logChatApproved,
    logChatUnapproved,
    logBroadcast
} = require('../utils/loggerFunctions');

const bot = telegramService.getBot();

// Owner ID (from env) - only owner can use admin commands
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');

// Check if user is owner
function isOwner(userId) {
    return userId === OWNER_ID;
}

// /banuser command
bot.command('banuser', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/banuser <user_id> [reason]`\n\n' +
                '*Example:* `/banuser 123456789 Spam`',
                { parse_mode: 'Markdown' }
            );
        }

        const userId = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';

        await banService.banUser(userId, reason, ctx.from.username || ctx.from.id);
        await logUserBanned(userId, userId, reason, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *User Banned*\n\n` +
            `🆔 *User ID:* \`${userId}\`\n` +
            `📝 *Reason:* ${reason}`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /banuser:', e);
        ctx.reply('❌ Error banning user.');
    }
});

// /unbanuser command
bot.command('unbanuser', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/unbanuser <user_id>`\n\n' +
                '*Example:* `/unbanuser 123456789`',
                { parse_mode: 'Markdown' }
            );
        }

        const userId = args[0];
        await banService.unbanUser(userId);
        await logUserUnbanned(userId, userId, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *User Unbanned*\n\n` +
            `🆔 *User ID:* \`${userId}\``,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /unbanuser:', e);
        ctx.reply('❌ Error unbanning user.');
    }
});

// /banchat command
bot.command('banchat', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/banchat <chat_id> [reason]`\n\n' +
                '*Example:* `/banchat -1001234567890 Spam group`',
                { parse_mode: 'Markdown' }
            );
        }

        const chatId = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';

        await banService.banChat(chatId, reason, ctx.from.username || ctx.from.id);
        await logChatBanned(chatId, chatId, reason, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *Chat Banned*\n\n` +
            `🆔 *Chat ID:* \`${chatId}\`\n` +
            `📝 *Reason:* ${reason}`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /banchat:', e);
        ctx.reply('❌ Error banning chat.');
    }
});

// /unbanchat command
bot.command('unbanchat', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/unbanchat <chat_id>`\n\n' +
                '*Example:* `/unbanchat -1001234567890`',
                { parse_mode: 'Markdown' }
            );
        }

        const chatId = args[0];
        await banService.unbanChat(chatId);
        await logChatUnbanned(chatId, chatId, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *Chat Unbanned*\n\n` +
            `🆔 *Chat ID:* \`${chatId}\``,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /unbanchat:', e);
        ctx.reply('❌ Error unbanning chat.');
    }
});

// /approvechat command
bot.command('approvechat', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/approvechat <chat_id> [chat_title]`\n\n' +
                '*Example:* `/approvechat -1001234567890 My Music Group`',
                { parse_mode: 'Markdown' }
            );
        }

        const chatId = args[0];
        const chatTitle = args.slice(1).join(' ') || 'Unknown';

        await banService.approveChat(chatId, chatTitle, ctx.from.username || ctx.from.id);
        await logChatApproved(chatId, chatTitle, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *Chat Approved*\n\n` +
            `🆔 *Chat ID:* \`${chatId}\`\n` +
            `📊 *Title:* ${chatTitle}`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /approvechat:', e);
        ctx.reply('❌ Error approving chat.');
    }
});

// /unapprovechat command
bot.command('unapprovechat', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/unapprovechat <chat_id>`\n\n' +
                '*Example:* `/unapprovechat -1001234567890`',
                { parse_mode: 'Markdown' }
            );
        }

        const chatId = args[0];
        await banService.unapproveChat(chatId);
        await logChatUnapproved(chatId, chatId, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *Chat Unapproved*\n\n` +
            `🆔 *Chat ID:* \`${chatId}\``,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /unapprovechat:', e);
        ctx.reply('❌ Error unapproving chat.');
    }
});

// /gethistory command
bot.command('gethistory', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/gethistory <user|chat> <id> [limit]`\n\n' +
                '*Examples:*\n' +
                '• `/gethistory user 123456789`\n' +
                '• `/gethistory chat -1001234567890 20`',
                { parse_mode: 'Markdown' }
            );
        }

        const type = args[0]; // 'user' or 'chat'
        const id = args[1];
        const limit = parseInt(args[2]) || 20;

        if (!['user', 'chat'].includes(type)) {
            return ctx.reply('❌ Type must be either `user` or `chat`', { parse_mode: 'Markdown' });
        }

        const history = await banService.getHistory(type, id, limit);

        if (!history || history.length === 0) {
            return ctx.reply(`📭 No history found for ${type} \`${id}\``, { parse_mode: 'Markdown' });
        }

        let message = `📜 *History for ${type} \`${id}\`*\n\n`;

        history.slice(0, 10).forEach((activity, i) => {
            const date = new Date(activity.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            message += `${i + 1}. *${activity.action}*\n`;
            message += `   ⏰ ${date}\n`;
            if (activity.details && Object.keys(activity.details).length > 0) {
                message += `   📝 ${JSON.stringify(activity.details)}\n`;
            }
            message += `\n`;
        });

        message += `\n_Showing ${Math.min(10, history.length)} of ${history.length} activities_`;

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('[AdminCommands] Error in /gethistory:', e);
        ctx.reply('❌ Error fetching history.');
    }
});

// /listbans command - list all bans
bot.command('listbans', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const bannedUsers = await banService.getAllBannedUsers();
        const bannedChats = await banService.getAllBannedChats();

        let message = `🚫 *Ban List*\n\n`;

        message += `*Banned Users (${bannedUsers.length}):*\n`;
        bannedUsers.slice(0, 10).forEach((ban, i) => {
            message += `${i + 1}. \`${ban.userId}\` - ${ban.reason}\n`;
        });

        message += `\n*Banned Chats (${bannedChats.length}):*\n`;
        bannedChats.slice(0, 10).forEach((ban, i) => {
            message += `${i + 1}. \`${ban.chatId}\` - ${ban.reason}\n`;
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('[AdminCommands] Error in /listbans:', e);
        ctx.reply('❌ Error listing bans.');
    }
});

// /listapproved command - list all approved chats
bot.command('listapproved', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const approvedChats = await banService.getAllApprovedChats();

        let message = `✅ *Approved Chats (${approvedChats.length})*\n\n`;

        approvedChats.slice(0, 20).forEach((approval, i) => {
            message += `${i + 1}. ${approval.chatTitle}\n`;
            message += `   🆔 \`${approval.chatId}\`\n`;
            message += `   👤 By: ${approval.approvedBy}\n\n`;
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('[AdminCommands] Error in /listapproved:', e);
        ctx.reply('❌ Error listing approved chats.');
    }
});

// /broadcast command - broadcast to all users (DM)
bot.command('broadcast', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        // Only works in bot DM
        if (ctx.chat.type !== 'private') {
            return ctx.reply('❌ This command only works in bot DM.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/broadcast <message>`\n\n' +
                '*Example:* `/broadcast Hello everyone! New features added.`\n\n' +
                '⚠️ This will send the message to ALL users who have started the bot.',
                { parse_mode: 'Markdown' }
            );
        }

        const message = args.join(' ');

        // Get all users who have started the bot
        const { client } = require('../redis');
        const userKeys = await client.keys('user_started:*');

        let successCount = 0;
        let failCount = 0;

        await ctx.reply(`📢 Broadcasting to ${userKeys.length} users...\n\n_This may take a while._`, { parse_mode: 'Markdown' });

        for (const key of userKeys) {
            const userId = key.replace('user_started:', '');
            try {
                await ctx.telegram.sendMessage(userId,
                    `📢 *Broadcast Message*\n\n${message}\n\n_From: @${config.bot.username}_`,
                    { parse_mode: 'Markdown' }
                );
                successCount++;

                // Rate limit: 30 messages per second max
                if (successCount % 30 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (e) {
                failCount++;
                console.error(`[Broadcast] Failed to send to ${userId}:`, e.message);
            }
        }

        await logBroadcast('users', userKeys.length, successCount, failCount, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *Broadcast Complete*\n\n` +
            `📤 Sent: ${successCount}\n` +
            `❌ Failed: ${failCount}\n` +
            `📊 Total: ${userKeys.length}`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /broadcast:', e);
        ctx.reply('❌ Error broadcasting message.');
    }
});

// /broadcastgroups command - broadcast to all groups
bot.command('broadcastgroups', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        // Only works in bot DM
        if (ctx.chat.type !== 'private') {
            return ctx.reply('❌ This command only works in bot DM.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/broadcastgroups <message>`\n\n' +
                '*Example:* `/broadcastgroups New update available! Check /help for details.`\n\n' +
                '⚠️ This will send the message to ALL approved groups.',
                { parse_mode: 'Markdown' }
            );
        }

        const message = args.join(' ');

        // Get all approved chats
        const approvedChats = await banService.getAllApprovedChats();

        if (approvedChats.length === 0) {
            return ctx.reply('❌ No approved chats found.');
        }

        let successCount = 0;
        let failCount = 0;

        await ctx.reply(`📢 Broadcasting to ${approvedChats.length} groups...\n\n_This may take a while._`, { parse_mode: 'Markdown' });

        for (const chat of approvedChats) {
            try {
                await ctx.telegram.sendMessage(chat.chatId,
                    `📢 *Announcement*\n\n${message}\n\n_From: @${config.bot.username}_`,
                    { parse_mode: 'Markdown' }
                );
                successCount++;

                // Rate limit: 20 messages per second for groups
                if (successCount % 20 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (e) {
                failCount++;
                console.error(`[BroadcastGroups] Failed to send to ${chat.chatId}:`, e.message);
            }
        }

        await logBroadcast('groups', approvedChats.length, successCount, failCount, ctx.from.username || ctx.from.first_name);

        ctx.reply(
            `✅ *Broadcast Complete*\n\n` +
            `📤 Sent: ${successCount}\n` +
            `❌ Failed: ${failCount}\n` +
            `📊 Total: ${approvedChats.length}`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /broadcastgroups:', e);
        ctx.reply('❌ Error broadcasting to groups.');
    }
});

// /id command - show group and user IDs (owner only, groups only)
bot.command('id', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        // Only works in groups
        if (ctx.chat.type === 'private') {
            return ctx.reply('❌ This command only works in group chats.');
        }

        const groupId = ctx.chat.id;
        const groupTitle = ctx.chat.title || 'Unknown';
        const userId = ctx.from.id;
        const userName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

        ctx.reply(
            `🆔 *ID Information*\n\n` +
            `*Group:*\n` +
            `📊 Name: ${groupTitle}\n` +
            `🆔 ID: \`${groupId}\`\n\n` +
            `*Your Info:*\n` +
            `👤 Name: ${userName}\n` +
            `🆔 ID: \`${userId}\``,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('[AdminCommands] Error in /id:', e);
        ctx.reply('❌ Error getting IDs.');
    }
});

// /info command - show ban/approval status and stats
bot.command('info', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 2) {
            return ctx.reply(
                '*Usage:* `/info <user|chat> <id>`\n\n' +
                '*Examples:*\n' +
                '• `/info user 123456789`\n' +
                '• `/info chat -1001234567890`',
                { parse_mode: 'Markdown' }
            );
        }

        const type = args[0]; // 'user' or 'chat'
        const id = args[1];

        if (!['user', 'chat'].includes(type)) {
            return ctx.reply('❌ Type must be either `user` or `chat`', { parse_mode: 'Markdown' });
        }

        const { Markup } = require('telegraf');
        let message = `ℹ️ *Information for ${type} \`${id}\`*\n\n`;
        let buttons = [];

        if (type === 'user') {
            const banInfo = await banService.isUserBanned(id);

            message += `*Ban Status:*\n`;
            if (banInfo) {
                message += `🚫 BANNED\n`;
                message += `📝 Reason: ${banInfo.reason}\n`;
                message += `👤 Banned by: ${banInfo.bannedBy}\n`;
                message += `⏰ Banned on: ${new Date(banInfo.bannedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
            } else {
                message += `✅ Not banned\n`;
            }

            // Add user link button
            buttons.push([Markup.button.url('👤 View User', `tg://user?id=${id}`)]);
        } else {
            const banInfo = await banService.isChatBanned(id);
            const approvalInfo = await banService.isChatApproved(id);

            message += `*Ban Status:*\n`;
            if (banInfo) {
                message += `🚫 BANNED\n`;
                message += `📝 Reason: ${banInfo.reason}\n`;
                message += `👤 Banned by: ${banInfo.bannedBy}\n`;
                message += `⏰ Banned on: ${new Date(banInfo.bannedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
            } else {
                message += `✅ Not banned\n`;
            }

            message += `\n*Approval Status:*\n`;
            if (approvalInfo) {
                message += `✅ APPROVED\n`;
                message += `📊 Title: ${approvalInfo.chatTitle}\n`;
                message += `👤 Approved by: ${approvalInfo.approvedBy}\n`;
                message += `⏰ Approved on: ${new Date(approvalInfo.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
            } else {
                message += `⚠️ Not approved\n`;
            }

            // Add chat link button
            const chatLink = `https://t.me/c/${id.toString().replace('-100', '')}/1`;
            buttons.push([Markup.button.url('📊 View Chat', chatLink)]);
        }

        // Get history
        const history = await banService.getHistory(type, id, 5);
        if (history && history.length > 0) {
            message += `\n*Recent Activity (Last 5):*\n`;
            history.forEach((activity, i) => {
                const date = new Date(activity.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
                message += `${i + 1}. ${activity.action} - ${date}\n`;
            });
        } else {
            message += `\n*Recent Activity:*\n`;
            message += `No activity recorded\n`;
        }

        ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: buttons.length > 0 ? Markup.inlineKeyboard(buttons) : undefined
        });
    } catch (e) {
        console.error('[AdminCommands] Error in /info:', e);
        ctx.reply('❌ Error getting info.');
    }
});

// /activity command - view activity logs with pagination
bot.command('activity', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 2) {
            return ctx.reply(
                '*Usage:* `/activity <user|chat> <id>`\n\n' +
                '*Examples:*\n' +
                '• `/activity user 123456789`\n' +
                '• `/activity chat -1001234567890`',
                { parse_mode: 'Markdown' }
            );
        }

        const type = args[0];
        const id = args[1];

        if (!['user', 'chat'].includes(type)) {
            return ctx.reply('❌ Type must be either `user` or `chat`', { parse_mode: 'Markdown' });
        }

        // Show first page
        await showActivityPage(ctx, type, id, 0);
    } catch (e) {
        console.error('[AdminCommands] Error in /activity:', e);
        ctx.reply('❌ Error getting activity logs.');
    }
});

// Helper function to show activity page
async function showActivityPage(ctx, type, id, page) {
    try {
        const { Markup } = require('telegraf');
        const ITEMS_PER_PAGE = 10;

        // Get all activity
        const allActivity = await banService.getHistory(type, id, 100); // Get up to 100 items

        if (!allActivity || allActivity.length === 0) {
            return ctx.reply(`📊 No activity found for ${type} \`${id}\``, { parse_mode: 'Markdown' });
        }

        const totalPages = Math.ceil(allActivity.length / ITEMS_PER_PAGE);
        const currentPage = Math.max(0, Math.min(page, totalPages - 1));

        const startIdx = currentPage * ITEMS_PER_PAGE;
        const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, allActivity.length);
        const pageItems = allActivity.slice(startIdx, endIdx);

        let message = `📊 *Activity Logs for ${type} \`${id}\`*\n\n`;
        message += `📄 Page ${currentPage + 1} of ${totalPages} (${allActivity.length} total)\n\n`;

        pageItems.forEach((activity, i) => {
            const num = startIdx + i + 1;
            const date = new Date(activity.timestamp).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'short',
                timeStyle: 'short'
            });
            message += `${num}. *${activity.action}*\n`;
            message += `   📅 ${date}\n`;
            if (activity.details) {
                const details = typeof activity.details === 'string' ? activity.details : JSON.stringify(activity.details);
                if (details.length < 50) {
                    message += `   ℹ️ ${details}\n`;
                }
            }
            message += `\n`;
        });

        // Create navigation buttons
        const buttons = [];
        const navRow = [];

        if (currentPage > 0) {
            navRow.push(Markup.button.callback('◀️ Previous', `activity_${type}_${id}_${currentPage - 1}`));
        }

        navRow.push(Markup.button.callback('🔄 Refresh', `activity_${type}_${id}_${currentPage}`));

        if (currentPage < totalPages - 1) {
            navRow.push(Markup.button.callback('Next ▶️', `activity_${type}_${id}_${currentPage + 1}`));
        }

        buttons.push(navRow);

        const keyboard = Markup.inlineKeyboard(buttons);

        // Edit message if it's a callback, otherwise send new
        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.answerCbQuery(`Page ${currentPage + 1}/${totalPages}`);
        } else {
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }
    } catch (e) {
        console.error('[AdminCommands] Error showing activity page:', e);
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery('❌ Error loading page');
        }
    }
}

// Callback handler for activity pagination
bot.action(/^activity_(.+)_(.+)_(\d+)$/, async (ctx) => {
    try {
        const type = ctx.match[1];
        const id = ctx.match[2];
        const page = parseInt(ctx.match[3]);

        await showActivityPage(ctx, type, id, page);
    } catch (e) {
        console.error('[AdminCommands] Error in activity callback:', e);
        await ctx.answerCbQuery('❌ Error');
    }
});

// /userstats command - show user song play statistics
bot.command('userstats', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply(
                '*Usage:* `/userstats <user_id>`\n\n' +
                '*Example:* `/userstats 123456789`\n\n' +
                'Shows song play statistics for a user.',
                { parse_mode: 'Markdown' }
            );
        }

        const userId = args[0];
        const { getUserStats } = require('../redis');
        const stats = await getUserStats(userId);

        let message = `📊 *User Statistics for \`${userId}\`*\n\n`;

        if (stats.songsAdded === 0 && stats.minutesListened === 0 && stats.roomsJoined === 0) {
            message += `📭 *No records found*\n\n`;
            message += `This user hasn't:\n`;
            message += `• Added any songs to queues\n`;
            message += `• Listened to any music\n`;
            message += `• Joined any music rooms\n\n`;
            message += `_Stats are tracked when users use /play command_`;
        } else {
            message += `🎵 *Songs Added:* \`${stats.songsAdded}\`\n`;
            message += `⏱ *Minutes Listened:* \`${stats.minutesListened}\`\n`;
            message += `🏠 *Rooms Joined:* \`${stats.roomsJoined}\`\n\n`;
            message += `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;
        }

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('[AdminCommands] Error in /userstats:', e);
        ctx.reply('❌ Error fetching user stats.');
    }
});

console.log('[Bot] Admin commands loaded');

module.exports = bot;
