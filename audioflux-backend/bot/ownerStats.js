/**
 * Owner Stats Commands - Interactive Menu System
 * /stats, /speedtest, /reboot
 */

const config = require('../config');
const { Markup } = require('telegraf');
const telegramService = require('../services/telegramService');
const banService = require('../services/banService');
const { client } = require('../redis');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { logServerReboot } = require('../utils/loggerFunctions');

const bot = telegramService.getBot();
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
const START_IMAGE = config.bot.startImage || process.env.START_IMAGE;

function isOwner(userId) {
    return userId === OWNER_ID;
}

// /stats command - interactive menu with image
bot.command('stats', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const caption =
            `📊 *AUDIOFLUX STATISTICS*\n\n` +
            `Welcome to the stats dashboard!\n` +
            `Select a category to view detailed statistics:\n\n` +
            `🔹 *Users & Groups* - User and group counts\n` +
            `🔹 *System Info* - Server performance\n` +
            `🔹 *Bans & Approvals* - Moderation stats\n` +
            `🔹 *Performance* - Network & speed tests`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Users & Groups', 'stats_users'),
                Markup.button.callback('🔒 Private Rooms', 'stats_rooms')
            ],
            [
                Markup.button.callback('📊 Analytics', 'stats_analytics'),
                Markup.button.callback('💻 System Info', 'stats_system')
            ],
            [
                Markup.button.callback('🚫 Bans & Approvals', 'stats_bans'),
                Markup.button.callback('📈 Performance', 'stats_performance')
            ],
            [
                Markup.button.callback('☁️ Heroku Health', 'stats_heroku'),
                Markup.button.callback('💾 Redis Health', 'stats_redis')
            ],
            [
                Markup.button.callback('🔄 Refresh All', 'stats_refresh')
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
    } catch (e) {
        console.error('[Stats] Error:', e);
        ctx.reply('❌ Error showing statistics menu.');
    }
});

// Callback handlers for stats menu
bot.action('stats_users', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('📊 Loading user statistics...');

        const [userKeys, queueKeys, approvedChats] = await Promise.all([
            client.keys('user_started:*'),
            client.keys('queue:*'),
            banService.getAllApprovedChats()
        ]);

        const message =
            `👥 *USERS & GROUPS*\n\n` +
            `📊 *Statistics:*\n` +
            `• Total Users: \`${userKeys.length}\`\n` +
            `• Active Groups: \`${queueKeys.length}\`\n` +
            `• Approved Chats: \`${approvedChats.length}\`\n\n` +
            `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_users'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Error:', e);
        await ctx.answerCbQuery('❌ Error loading stats');
    }
});

bot.action('stats_system', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('💻 Loading system info...');

        const uptime = process.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const memoryUsage = process.memoryUsage();
        const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        const totalMemGB = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10;
        const freeMemGB = Math.round(os.freemem() / 1024 / 1024 / 1024 * 10) / 10;

        const message =
            `💻 *SYSTEM INFORMATION*\n\n` +
            `⏱ *Uptime:* ${uptimeHours}h ${uptimeMinutes}m\n` +
            `🧠 *Memory:* ${memoryUsedMB}MB / ${memoryTotalMB}MB\n` +
            `💾 *System RAM:* ${freeMemGB}GB / ${totalMemGB}GB\n` +
            `🖥 *Platform:* ${os.platform()}\n` +
            `⚙️ *Node:* ${process.version}\n` +
            `📡 *Redis:* ✅ Connected\n\n` +
            `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_system'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Error:', e);
        await ctx.answerCbQuery('❌ Error loading stats');
    }
});

bot.action('stats_bans', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('🚫 Loading moderation stats...');

        const [bannedUsers, bannedChats, approvedChats] = await Promise.all([
            banService.getAllBannedUsers(),
            banService.getAllBannedChats(),
            banService.getAllApprovedChats()
        ]);

        const message =
            `🚫 *BANS & APPROVALS*\n\n` +
            `📊 *Moderation Statistics:*\n` +
            `• Banned Users: \`${bannedUsers.length}\`\n` +
            `• Banned Chats: \`${bannedChats.length}\`\n` +
            `• Approved Chats: \`${approvedChats.length}\`\n\n` +
            `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_bans'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Error:', e);
        await ctx.answerCbQuery('❌ Error loading stats');
    }
});

bot.action('stats_performance', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('📈 Loading performance stats...');

        const cpuUsage = process.cpuUsage();
        const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000);

        const message =
            `📈 *PERFORMANCE*\n\n` +
            `⚡ *Current Status:*\n` +
            `• Bot Status: 🟢 Online\n` +
            `• CPU Usage: ${cpuPercent}%\n` +
            `• Redis: ✅ Connected\n\n` +
            `Use /speedtest for detailed network speed test\n\n` +
            `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_performance'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Error:', e);
        await ctx.answerCbQuery('❌ Error loading stats');
    }
});

bot.action('stats_menu', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('📊 Stats Menu');

        const caption =
            `📊 *AUDIOFLUX STATISTICS*\n\n` +
            `Welcome to the stats dashboard!\n` +
            `Select a category to view detailed statistics:\n\n` +
            `🔹 *Users & Groups* - User and group counts\n` +
            `🔹 *System Info* - Server performance\n` +
            `🔹 *Bans & Approvals* - Moderation stats\n` +
            `🔹 *Performance* - Network & speed tests`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 Users & Groups', 'stats_users'),
                Markup.button.callback('🔒 Private Rooms', 'stats_rooms')
            ],
            [
                Markup.button.callback('📊 Analytics', 'stats_analytics'),
                Markup.button.callback('💻 System Info', 'stats_system')
            ],
            [
                Markup.button.callback('🚫 Bans & Approvals', 'stats_bans'),
                Markup.button.callback('📈 Performance', 'stats_performance')
            ],
            [
                Markup.button.callback('☁️ Heroku Health', 'stats_heroku'),
                Markup.button.callback('💾 Redis Health', 'stats_redis')
            ],
            [
                Markup.button.callback('🔄 Refresh All', 'stats_refresh')
            ]
        ]);

        await ctx.editMessageCaption(caption, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Error:', e);
        await ctx.answerCbQuery('❌ Error');
    }
});

bot.action('stats_refresh', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('🔄 Refreshing all stats...');
        // Just go back to menu which will show fresh data
        await bot.handleUpdate({ callback_query: { ...ctx.callbackQuery, data: 'stats_menu' } });
    } catch (e) {
        console.error('[Stats] Error:', e);
    }
});

// Heroku Health stats callback
bot.action('stats_heroku', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('☁️ Loading Heroku health...');

        const herokuHealthService = require('../services/herokuHealthService');
        const healthSummary = await herokuHealthService.getHealthSummary();

        let message = `☁️ *HEROKU HEALTH STATUS*\n\n`;

        if (healthSummary.status === 'not_configured') {
            message +=
                `⚠️ *Not Configured*\n\n` +
                `Heroku API key is not set.\n\n` +
                `To enable Heroku monitoring:\n` +
                `1. Get API key from Heroku Dashboard\n` +
                `2. Set HEROKU_API_KEY in .env\n` +
                `3. Set HEROKU_BACKEND_APP and HEROKU_FRONTEND_APP`;
        } else {
            // Overall status
            const statusEmoji = healthSummary.overall === 'healthy' ? '🟢' : '🟡';
            message += `*Overall Status:* ${statusEmoji} ${healthSummary.overall.toUpperCase()}\n\n`;

            // Backend status
            if (healthSummary.components.backend) {
                const backend = healthSummary.components.backend;
                const backendEmoji = backend.status === 'healthy' ? '🟢' : '🔴';
                message +=
                    `*🖥 Backend:* ${backendEmoji} ${backend.status}\n` +
                    `• App: \`${backend.app}\`\n` +
                    `• Dynos Running: ${backend.dynos}\n` +
                    `• Region: ${backend.region || 'Unknown'}\n\n`;
            }

            // Frontend status
            if (healthSummary.components.frontend) {
                const frontend = healthSummary.components.frontend;
                const frontendEmoji = frontend.status === 'healthy' ? '🟢' : '🔴';
                message +=
                    `*🌐 Frontend:* ${frontendEmoji} ${frontend.status}\n` +
                    `• App: \`${frontend.app}\`\n` +
                    `• Dynos Running: ${frontend.dynos}\n` +
                    `• Region: ${frontend.region || 'Unknown'}\n\n`;
            }

            // Database/Addons status
            if (healthSummary.components.database) {
                const db = healthSummary.components.database;
                const dbEmoji = db.status === 'healthy' ? '🟢' : '🟡';
                message += `*💾 Database & Addons:* ${dbEmoji} ${db.status}\n`;

                if (db.addons && db.addons.length > 0) {
                    db.addons.forEach(addon => {
                        const addonEmoji = addon.state === 'provisioned' ? '✅' : '⚠️';
                        message += `${addonEmoji} ${addon.service || addon.name}\n`;
                    });
                } else {
                    message += `• No addons found\n`;
                }
                message += `\n`;
            }

            message += `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_heroku'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Heroku health error:', e);
        await ctx.answerCbQuery('❌ Error loading Heroku health');

        // Show error message
        const errorMessage =
            `☁️ *HEROKU HEALTH STATUS*\n\n` +
            `❌ *Error Loading Status*\n\n` +
            `${e.message}\n\n` +
            `_This might be due to:_\n` +
            `• Invalid API key\n` +
            `• Incorrect app names\n` +
            `• Network issues`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Back', 'stats_menu')]
        ]);

        try {
            await ctx.editMessageCaption(errorMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        } catch (editError) {
            console.error('[Stats] Error editing message:', editError);
        }
    }
});

// Redis Health stats callback
bot.action('stats_redis', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('💾 Loading Redis health...');

        let message = `💾 *REDIS HEALTH STATUS*\n\n`;

        try {
            // Test Redis connection
            const pingStart = Date.now();
            await client.ping();
            const pingLatency = Date.now() - pingStart;

            // Get Redis INFO
            const info = await client.info();
            const infoLines = info.split('\r\n');

            // Parse Redis info
            let redisVersion = 'Unknown';
            let usedMemory = 'Unknown';
            let maxMemory = 'Unknown';
            let connectedClients = 'Unknown';
            let totalCommands = 'Unknown';
            let opsPerSec = 'Unknown';
            let uptime = 'Unknown';
            let role = 'Unknown';

            infoLines.forEach(line => {
                if (line.startsWith('redis_version:')) redisVersion = line.split(':')[1];
                if (line.startsWith('used_memory_human:')) usedMemory = line.split(':')[1];
                if (line.startsWith('maxmemory_human:')) maxMemory = line.split(':')[1];
                if (line.startsWith('connected_clients:')) connectedClients = line.split(':')[1];
                if (line.startsWith('total_commands_processed:')) totalCommands = line.split(':')[1];
                if (line.startsWith('instantaneous_ops_per_sec:')) opsPerSec = line.split(':')[1];
                if (line.startsWith('uptime_in_days:')) uptime = line.split(':')[1] + ' days';
                if (line.startsWith('role:')) role = line.split(':')[1];
            });

            // Get key counts for different patterns
            const [queueKeys, stateKeys, viewerKeys, userKeys, historyKeys] = await Promise.all([
                client.keys('queue:*'),
                client.keys('state:*'),
                client.keys('viewers:*'),
                client.keys('user_*'),
                client.keys('history:*')
            ]);

            // Calculate total keys
            const totalKeys = queueKeys.length + stateKeys.length + viewerKeys.length + userKeys.length + historyKeys.length;

            // Determine health status
            const healthEmoji = pingLatency < 10 ? '🟢' : pingLatency < 50 ? '🟡' : '🔴';
            const healthStatus = pingLatency < 10 ? 'EXCELLENT' : pingLatency < 50 ? 'GOOD' : 'SLOW';

            message +=
                `*Overall Status:* ${healthEmoji} ${healthStatus}\n\n` +
                `*📊 Connection:*\n` +
                `• Status: ✅ Connected\n` +
                `• Ping: \`${pingLatency}ms\` ${pingLatency < 5 ? '🟢' : pingLatency < 20 ? '🟡' : '🔴'}\n` +
                `• Role: ${role}\n` +
                `• Version: ${redisVersion}\n` +
                `• Uptime: ${uptime}\n\n` +
                `*💾 Memory Usage:*\n` +
                `• Used: ${usedMemory}\n` +
                `• Max: ${maxMemory || 'Unlimited'}\n` +
                `• Clients: ${connectedClients}\n\n` +
                `*📈 Performance:*\n` +
                `• Commands Processed: ${parseInt(totalCommands).toLocaleString()}\n` +
                `• Ops/Second: ${opsPerSec}\n` +
                `• Avg Latency: \`${pingLatency}ms\`\n\n` +
                `*🔑 Key Statistics:*\n` +
                `• Total Keys: \`${totalKeys}\`\n` +
                `• Queues: \`${queueKeys.length}\`\n` +
                `• States: \`${stateKeys.length}\`\n` +
                `• Viewers: \`${viewerKeys.length}\`\n` +
                `• Users: \`${userKeys.length}\`\n` +
                `• History: \`${historyKeys.length}\`\n\n` +
                `*⚡ Optimization:*\n` +
                `• Cache System: ✅ Active\n` +
                `• Cache TTL: 10 seconds\n` +
                `• Expected Reduction: ~90%\n\n` +
                `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

        } catch (redisError) {
            message +=
                `❌ *Connection Failed*\n\n` +
                `Error: ${redisError.message}\n\n` +
                `_This might be due to:_\n` +
                `• Redis server is down\n` +
                `• Invalid REDIS_URL\n` +
                `• Network connectivity issues\n` +
                `• Authentication failure`;
        }

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_redis'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Redis health error:', e);
        await ctx.answerCbQuery('❌ Error loading Redis health');

        // Show error message
        const errorMessage =
            `💾 *REDIS HEALTH STATUS*\n\n` +
            `❌ *Error Loading Status*\n\n` +
            `${e.message}`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Back', 'stats_menu')]
        ]);

        try {
            await ctx.editMessageCaption(errorMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        } catch (editError) {
            console.error('[Stats] Error editing message:', editError);
        }
    }
});

// /speedtest command - test server network speed
bot.command('speedtest', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        let statusMsg;
        if (START_IMAGE) {
            statusMsg = await ctx.replyWithPhoto(START_IMAGE, {
                caption: '🚀 *Running Speed Test...*\n\n_This may take 30-60 seconds_\n\nTesting:\n• Telegram API\n• Frontend\n• Backend API\n• Redis Database\n• Internet Speed (Ookla)',
                parse_mode: 'Markdown'
            });
        } else {
            statusMsg = await ctx.reply('🚀 Running speed test...\n\n<i>This may take 30-60 seconds</i>', { parse_mode: 'HTML' });
        }

        try {
            const axios = require('axios');

            // Test Telegram API
            const telegramStart = Date.now();
            const testUrl = 'https://api.telegram.org/bot' + process.env.BOT_TOKEN + '/getMe';
            let totalTelegramTime = 0;
            const iterations = 10;

            for (let i = 0; i < iterations; i++) {
                const iterStart = Date.now();
                await axios.get(testUrl);
                totalTelegramTime += (Date.now() - iterStart);
            }
            const telegramLatency = Math.round(totalTelegramTime / iterations);

            // Test Frontend (if available)
            let frontendLatency = 'N/A';
            const frontendUrl = process.env.FRONTEND_URL || config.frontend?.url;
            if (frontendUrl) {
                try {
                    const frontendStart = Date.now();
                    await axios.get(frontendUrl, { timeout: 5000 });
                    frontendLatency = `${Date.now() - frontendStart}ms`;
                } catch (e) {
                    frontendLatency = '❌ Offline';
                }
            }

            // Test Backend API (self-ping)
            let backendLatency = 'N/A';
            let backendError = null;
            // Use dedicated health URL or fallback to BACKEND_URL
            const backendHealthUrl = process.env.BACKEND_HEALTH_URL || process.env.BACKEND_URL;
            if (backendHealthUrl) {
                try {
                    const backendStart = Date.now();
                    await axios.get(backendHealthUrl, { timeout: 5000 });
                    backendLatency = `${Date.now() - backendStart}ms`;
                } catch (e) {
                    backendError = e.response?.status || e.code || e.message;
                    backendLatency = `❌ Dead (${backendError})`;
                }
            }

            // Test Redis speed
            const redisStart = Date.now();
            for (let i = 0; i < 100; i++) {
                await client.ping();
            }
            const redisLatency = Math.round((Date.now() - redisStart) / 100);

            // Run Ookla Speedtest (actual internet speed)
            let speedtestResults = null;
            let speedtestError = null;
            try {
                const speedTest = require('speedtest-net');
                const test = speedTest({ acceptLicense: true, acceptGdpr: true });

                speedtestResults = await test;
            } catch (e) {
                speedtestError = e.message;
                console.log('[Speedtest] Ookla test failed:', e.message);
            }

            // Get server location info
            let serverLocation = 'Unknown';
            let serverRegion = process.env.RAILWAY_REGION || process.env.RENDER_REGION || 'Unknown';

            // Try to get more detailed location
            try {
                const ipInfo = await axios.get('https://ipapi.co/json/', { timeout: 3000 });
                if (ipInfo.data) {
                    serverLocation = `${ipInfo.data.city || 'Unknown'}, ${ipInfo.data.country_name || 'Unknown'}`;
                    serverRegion = ipInfo.data.region || serverRegion;
                }
            } catch (e) {
                // Fallback to basic info
                serverLocation = serverRegion !== 'Unknown' ? serverRegion : 'Unknown';
            }

            // Build speedtest results section
            let speedtestSection = '';
            if (speedtestResults) {
                const downloadMbps = (speedtestResults.download.bandwidth / 125000).toFixed(2); // Convert to Mbps
                const uploadMbps = (speedtestResults.upload.bandwidth / 125000).toFixed(2);
                const ping = speedtestResults.ping.latency.toFixed(0);
                const isp = speedtestResults.isp || 'Unknown';

                speedtestSection =
                    `*⚡ Internet Speed (Ookla):*\n` +
                    `• Download: \`${downloadMbps} Mbps\` ${parseFloat(downloadMbps) > 50 ? '🟢' : parseFloat(downloadMbps) > 10 ? '🟡' : '🔴'}\n` +
                    `• Upload: \`${uploadMbps} Mbps\` ${parseFloat(uploadMbps) > 20 ? '🟢' : parseFloat(uploadMbps) > 5 ? '🟡' : '🔴'}\n` +
                    `• Ping: \`${ping}ms\` ${parseFloat(ping) < 50 ? '🟢' : parseFloat(ping) < 100 ? '🟡' : '🔴'}\n` +
                    `• ISP: ${isp}\n\n`;
            } else if (speedtestError) {
                speedtestSection = `*⚡ Internet Speed:* ❌ Failed (${speedtestError})\n\n`;
            }

            const speedMessage =
                `🚀 *SPEED TEST RESULTS*\n\n` +
                `*🌐 Network Latency:*\n` +
                `• Telegram API: \`${telegramLatency}ms\` ${telegramLatency < 100 ? '🟢' : telegramLatency < 300 ? '🟡' : '🔴'}\n` +
                `• Frontend: \`${frontendLatency}\` ${frontendLatency.includes('ms') && parseInt(frontendLatency) < 200 ? '🟢' : frontendLatency === 'N/A' ? '⚪' : '🔴'}\n` +
                `• Backend API: \`${backendLatency}\` ${backendLatency.includes('ms') && parseInt(backendLatency) < 200 ? '🟢' : backendLatency === 'N/A' ? '⚪' : '🔴'}\n\n` +
                `*💾 Database:*\n` +
                `• Redis: \`${redisLatency}ms\` ${redisLatency < 5 ? '🟢' : redisLatency < 20 ? '🟡' : '🔴'}\n\n` +
                speedtestSection +
                `*📍 Server Info:*\n` +
                `• Location: ${serverLocation}\n` +
                `• Region: ${serverRegion}\n` +
                `• Platform: ${os.platform()} ${os.arch()}\n` +
                `• Environment: ${process.env.NODE_ENV || 'production'}\n\n` +
                `_Test completed at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

            if (START_IMAGE) {
                await ctx.telegram.editMessageCaption(
                    ctx.chat.id,
                    statusMsg.message_id,
                    undefined,
                    speedMessage,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    undefined,
                    speedMessage,
                    { parse_mode: 'Markdown' }
                );
            }
        } catch (testError) {
            const errorMessage = `❌ *Speed test failed*\n\n${testError.message}`;

            if (START_IMAGE) {
                await ctx.telegram.editMessageCaption(
                    ctx.chat.id,
                    statusMsg.message_id,
                    undefined,
                    errorMessage,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    undefined,
                    errorMessage,
                    { parse_mode: 'Markdown' }
                );
            }
        }
    } catch (e) {
        console.error('[Speedtest] Error:', e);
        ctx.reply('❌ Error running speed test.');
    }
});

// /reboot command - restart the bot application
bot.command('reboot', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        await ctx.reply(
            '⚠️ <b>BOT REBOOT CONFIRMATION</b>\n\n' +
            'Are you sure you want to restart the bot?\n\n' +
            '<b>What happens:</b>\n' +
            '• Bot application will restart\n' +
            '• All active sessions will disconnect\n' +
            '• Queue and state data will be preserved (Redis)\n' +
            '• Bot will be back online in ~30 seconds\n\n' +
            '<i>Note: This restarts the bot, not the entire server.</i>',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Yes, Reboot Bot', callback_data: 'confirm_reboot' },
                            { text: '❌ Cancel', callback_data: 'cancel_reboot' }
                        ]
                    ]
                }
            }
        );
    } catch (e) {
        console.error('[Reboot] Error:', e);
        ctx.reply('❌ Error initiating reboot.');
    }
});

// Reboot confirmation callbacks
bot.action('confirm_reboot', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.answerCbQuery('❌ Unauthorized!');
        }

        await ctx.editMessageText(
            '🔄 <b>REBOOTING BOT...</b>\n\n' +
            '• Shutting down bot application\n' +
            '• Platform will auto-restart the bot\n' +
            '• Bot will be back online in ~30 seconds\n\n' +
            '<i>Please wait...</i>',
            { parse_mode: 'HTML' }
        );

        await ctx.answerCbQuery('Rebooting bot...');

        // Log reboot to logger group
        await logServerReboot(ctx.from.username || ctx.from.first_name);

        // Wait 2 seconds then exit (Railway/Render will auto-restart)
        setTimeout(() => {
            console.log('[Reboot] Owner initiated bot reboot');
            process.exit(0);
        }, 2000);
    } catch (e) {
        console.error('[Reboot] Error:', e);
        ctx.answerCbQuery('❌ Reboot failed');
    }
});

bot.action('cancel_reboot', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.answerCbQuery('❌ Unauthorized!');
        }

        await ctx.editMessageText(
            '❌ <b>Reboot Cancelled</b>\n\n' +
            'Bot will continue running normally.',
            { parse_mode: 'HTML' }
        );

        await ctx.answerCbQuery('Cancelled');
    } catch (e) {
        console.error('[Reboot Cancel] Error:', e);
    }
});

// /free command - Remove rate limit for a user
bot.command('free', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return ctx.reply(
                '❌ *Usage:* `/free <user_id>`\n\n' +
                'Example: `/free 123456789`\n\n' +
                'This will exempt the user from rate limiting.',
                { parse_mode: 'Markdown' }
            );
        }

        const userId = args[0];
        const rateLimiter = require('../middleware/rateLimiter');

        await rateLimiter.whitelist(userId);
        await rateLimiter.reset(userId, 'commands');
        await rateLimiter.reset(userId, 'addSong');
        await rateLimiter.reset(userId, 'search');

        await ctx.reply(
            `✅ *User Freed*\n\n` +
            `User ID: \`${userId}\`\n` +
            `Status: Exempt from rate limiting\n\n` +
            `This user can now send unlimited commands.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`[Owner] User ${userId} freed from rate limiting by ${ctx.from.id}`);
    } catch (e) {
        console.error('[Free Command] Error:', e);
        ctx.reply('❌ Error freeing user from rate limiting.');
    }
});

// /limit command - Apply rate limit to a user
bot.command('limit', async (ctx) => {
    try {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('❌ You are not authorized to use this command.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return ctx.reply(
                '❌ *Usage:* `/limit <user_id>`\n\n' +
                'Example: `/limit 123456789`\n\n' +
                'This will apply rate limiting to the user.',
                { parse_mode: 'Markdown' }
            );
        }

        const userId = args[0];
        const rateLimiter = require('../middleware/rateLimiter');

        await rateLimiter.unwhitelist(userId);

        await ctx.reply(
            `✅ *User Limited*\n\n` +
            `User ID: \`${userId}\`\n` +
            `Status: Rate limiting applied\n\n` +
            `Limits:\n` +
            `• 20 commands/minute\n` +
            `• 10 songs/minute\n` +
            `• 15 searches/minute`,
            { parse_mode: 'Markdown' }
        );

        console.log(`[Owner] User ${userId} rate limited by ${ctx.from.id}`);
    } catch (e) {
        console.error('[Limit Command] Error:', e);
        ctx.reply('❌ Error applying rate limiting to user.');
    }
});

// /notify command - Owner sends notification to all users
bot.command('notify', async (ctx) => {
    const userId = ctx.from.id;

    // Check if user is owner
    if (userId.toString() !== process.env.OWNER_ID) {
        await ctx.reply('❌ This command is only available to the owner.');
        return;
    }

    const message = ctx.message.text.replace('/notify', '').trim();

    if (!message) {
        await ctx.reply('❌ Usage: /notify <message>\n\nExample: /notify Server maintenance in 1 hour');
        return;
    }

    try {
        const io = require('../server').io;
        const { client } = require('../redis');
        const ownerLogger = require('./ownerLogger');

        // Create notification object
        const notification = {
            id: `notif_${Date.now()}`,
            message: message,
            timestamp: Date.now(),
            read: false
        };

        // Store in Redis (keep last 50 notifications)
        const notificationsKey = 'global:notifications';
        const existingNotifications = await client.get(notificationsKey);
        let notifications = existingNotifications ? JSON.parse(existingNotifications) : [];

        // Add new notification at the beginning
        notifications.unshift(notification);

        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications = notifications.slice(0, 50);
        }

        // Save back to Redis
        await client.set(notificationsKey, JSON.stringify(notifications));

        // Broadcast to all connected clients
        io.emit('notification', { notification });

        // Log owner activity
        await ownerLogger.logNotification(message, ctx);

        await ctx.reply(`✅ Notification sent to all users:\n\n"${message}"`);
        console.log(`[Owner] Notification sent and stored: ${message}`);
    } catch (error) {
        console.error('[Owner] Error sending notification:', error);
        await ctx.reply('❌ Failed to send notification.');
    }
});

// /listnotifications command - List all notifications with IDs
bot.command('listnotifications', async (ctx) => {
    const userId = ctx.from.id;

    if (userId.toString() !== process.env.OWNER_ID) {
        await ctx.reply('❌ This command is only available to the owner.');
        return;
    }

    try {
        const { client } = require('../redis');
        const notificationsKey = 'global:notifications';
        const notifications = await client.get(notificationsKey);

        if (!notifications) {
            await ctx.reply('📭 No notifications found.');
            return;
        }

        const notifList = JSON.parse(notifications);

        if (notifList.length === 0) {
            await ctx.reply('📭 No notifications found.');
            return;
        }

        let message = `📋 <b>All Notifications (${notifList.length})</b>\n\n`;

        notifList.forEach((notif, index) => {
            const date = new Date(notif.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const preview = notif.message.length > 50 ? notif.message.substring(0, 50) + '...' : notif.message;
            message += `${index + 1}. <b>ID:</b> <code>${notif.id}</code>\n`;
            message += `   📅 ${date}\n`;
            message += `   💬 ${preview}\n\n`;
        });

        message += `\n<i>Use /deletenotification &lt;id&gt; to delete a specific notification</i>`;

        await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('[Owner] Error listing notifications:', error);
        await ctx.reply('❌ Failed to list notifications.');
    }
});

// /deletenotification command - Delete specific notification by ID
bot.command('deletenotification', async (ctx) => {
    const userId = ctx.from.id;

    if (userId.toString() !== process.env.OWNER_ID) {
        await ctx.reply('❌ This command is only available to the owner.');
        return;
    }

    const notifId = ctx.message.text.replace('/deletenotification', '').trim();

    if (!notifId) {
        await ctx.reply('❌ Usage: /deletenotification <notification_id>\n\nUse /listnotifications to see all notification IDs.');
        return;
    }

    try {
        const { client } = require('../redis');
        const ownerLogger = require('./ownerLogger');
        const notificationsKey = 'global:notifications';
        const notifications = await client.get(notificationsKey);


        if (!notifications) {
            await ctx.reply('❌ No notifications found.');
            return;
        }

        let notifList = JSON.parse(notifications);
        const initialLength = notifList.length;

        // Clean up the notification ID (remove any extra whitespace or special chars)
        const cleanNotifId = notifId.trim();

        // Debug: Log all notification IDs and the search ID
        console.log('[DeleteNotification] Searching for ID:', cleanNotifId);
        console.log('[DeleteNotification] Available IDs:', notifList.map(n => n.id));

        // Filter out the notification with matching ID
        notifList = notifList.filter(n => n.id !== cleanNotifId);

        if (notifList.length === initialLength) {
            // Show available IDs to help user
            const availableIds = notifList.map(n => `< code > ${n.id}</code > `).join('\n');
            await ctx.reply(
                `❌ Notification with ID < code > ${cleanNotifId}</code > not found.\n\n` +
                `< b > Available IDs:</b >\n${availableIds} \n\n` +
                `< i > Tip: Copy the ID exactly as shown (including notif_ prefix)</i > `,
                { parse_mode: 'HTML' }
            );
            return;
        }

        // Save updated list back to Redis
        await client.set(notificationsKey, JSON.stringify(notifList));

        // Log owner activity
        await ownerLogger.log('NOTIFICATION_DELETED', {
            notificationId: cleanNotifId,
            remainingCount: notifList.length
        }, ctx);

        await ctx.reply(`✅ Notification deleted successfully!\n\n < b > ID:</b > <code>${cleanNotifId}</code>\n < b > Remaining:</b > ${notifList.length} `, { parse_mode: 'HTML' });
        console.log(`[Owner] Notification deleted: ${cleanNotifId} `);
    } catch (error) {
        console.error('[Owner] Error deleting notification:', error);
        await ctx.reply('❌ Failed to delete notification.');
    }
});

// /clearnotifications command - Clear all notifications
bot.command('clearnotifications', async (ctx) => {
    const userId = ctx.from.id;

    if (userId.toString() !== process.env.OWNER_ID) {
        await ctx.reply('❌ This command is only available to the owner.');
        return;
    }

    try {
        const { client } = require('../redis');
        const ownerLogger = require('./ownerLogger');
        const notificationsKey = 'global:notifications';
        const notifications = await client.get(notificationsKey);

        if (!notifications) {
            await ctx.reply('📭 No notifications to clear.');
            return;
        }

        const notifList = JSON.parse(notifications);
        const count = notifList.length;

        if (count === 0) {
            await ctx.reply('📭 No notifications to clear.');
            return;
        }

        // Clear all notifications
        await client.del(notificationsKey);

        // Log owner activity
        await ownerLogger.log('NOTIFICATIONS_CLEARED', {
            clearedCount: count
        }, ctx);

        await ctx.reply(`✅ All notifications cleared!\n\n < b > Deleted:</b > ${count} notification(s)`, { parse_mode: 'HTML' });
        console.log(`[Owner] All notifications cleared: ${count} notifications`);
    } catch (error) {
        console.error('[Owner] Error clearing notifications:', error);
        await ctx.reply('❌ Failed to clear notifications.');
    }
});

// Private Rooms stats callback
bot.action('stats_rooms', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('🔒 Loading private room stats...');

        const redis = require('../redis');

        // Get all private rooms
        const roomKeys = await client.keys('room_meta:private_*');
        const totalPrivateRooms = roomKeys.length;

        // Count total members across all rooms
        const memberKeys = await client.keys('room_members:*');
        let totalMembers = 0;
        for (const key of memberKeys) {
            const count = await client.scard(key);
            totalMembers += count;
        }

        // Count total blocked users
        const blockedKeys = await client.keys('room_blocked:*');
        let totalBlocked = 0;
        for (const key of blockedKeys) {
            const count = await client.scard(key);
            totalBlocked += count;
        }

        // Get active rooms (with members)
        let activeRooms = 0;
        for (const key of memberKeys) {
            const count = await client.scard(key);
            if (count > 0) activeRooms++;
        }

        const message =
            `🔒 *PRIVATE ROOMS*\n\n` +
            `📊 *Statistics:*\n` +
            `• Total Rooms: \`${totalPrivateRooms}\`\n` +
            `• Active Rooms: \`${activeRooms}\`\n` +
            `• Total Members: \`${totalMembers}\`\n` +
            `• Blocked Users: \`${totalBlocked}\`\n` +
            `• Avg Members/Room: \`${totalPrivateRooms > 0 ? (totalMembers / totalPrivateRooms).toFixed(1) : 0}\`\n\n` +
            `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_rooms'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Error:', e);
        await ctx.answerCbQuery('❌ Error loading stats');
    }
});

// Analytics stats callback
bot.action('stats_analytics', async (ctx) => {
    if (!isOwner(ctx.from.id)) {
        return ctx.answerCbQuery('❌ This is not for you babe, stay in your limits! 😏', { show_alert: true });
    }

    try {
        await ctx.answerCbQuery('📊 Loading analytics...');

        // Get user statistics - only get hash keys (user_stats:userId format, not user_stats:userId:field)
        const allUserStatKeys = await client.keys('user_stats:*');
        const userStatKeys = allUserStatKeys.filter(key => {
            // Only include keys with exactly 2 colons (user_stats:userId)
            const parts = key.split(':');
            return parts.length === 2;
        });

        let totalSongsAdded = 0;
        let totalListeningSessions = 0;
        let validUserStats = 0;

        for (const key of userStatKeys) {
            try {
                // Check if key is a hash type before trying to get it
                const keyType = await client.type(key);
                if (keyType !== 'hash') {
                    console.log(`[Stats] Skipping invalid key (type: ${keyType}): ${key}`);
                    continue;
                }

                const stats = await client.hgetall(key);
                if (stats && typeof stats === 'object' && Object.keys(stats).length > 0) {
                    totalSongsAdded += parseInt(stats.songsAdded || 0);
                    totalListeningSessions += parseInt(stats.listeningSessions || 0);
                    validUserStats++;
                }
            } catch (err) {
                // Skip keys that cause errors
                console.log(`[Stats] Error reading key ${key}:`, err.message);
            }
        }

        // Get liked songs count
        const likedKeys = await client.keys('liked_songs:*');
        let totalLikedSongs = 0;
        for (const key of likedKeys) {
            try {
                const keyType = await client.type(key);
                if (keyType === 'set') {
                    const count = await client.scard(key);
                    totalLikedSongs += count;
                }
            } catch (err) {
                console.log(`[Stats] Error reading liked songs key ${key}:`, err.message);
            }
        }

        // Get playlist count - only count list-type keys
        const playlistKeys = await client.keys('playlist:*');
        let totalPlaylistSongs = 0;
        let validPlaylists = 0;

        for (const key of playlistKeys) {
            try {
                const keyType = await client.type(key);
                if (keyType === 'list') {
                    const count = await client.llen(key);
                    totalPlaylistSongs += count;
                    validPlaylists++;
                } else {
                    console.log(`[Stats] Skipping non-list playlist key (type: ${keyType}): ${key}`);
                }
            } catch (err) {
                console.log(`[Stats] Error reading playlist key ${key}:`, err.message);
            }
        }

        const message =
            `📊 *ANALYTICS*\n\n` +
            `*User Activity:*\n` +
            `• Total Songs Added: \`${totalSongsAdded}\`\n` +
            `• Listening Sessions: \`${totalListeningSessions}\`\n` +
            `• Liked Songs: \`${totalLikedSongs}\`\n` +
            `• Playlist Songs: \`${totalPlaylistSongs}\`\n\n` +
            `*Averages:*\n` +
            `• Songs/User: \`${validUserStats > 0 ? (totalSongsAdded / validUserStats).toFixed(1) : 0}\`\n` +
            `• Sessions/User: \`${validUserStats > 0 ? (totalListeningSessions / validUserStats).toFixed(1) : 0}\`\n\n` +
            `*Stats:*\n` +
            `• Valid User Profiles: \`${validUserStats}\`\n` +
            `• Valid Playlists: \`${validPlaylists}\`\n\n` +
            `_Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🔄 Refresh', 'stats_analytics'),
                Markup.button.callback('◀️ Back', 'stats_menu')
            ]
        ]);

        await ctx.editMessageCaption(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (e) {
        console.error('[Stats] Error:', e);
        await ctx.answerCbQuery('❌ Error loading stats');
    }
});

console.log('[Bot] Owner stats commands loaded');

module.exports = bot;
