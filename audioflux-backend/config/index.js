require('dotenv').config();

const config = {
    // Bot Configuration
    bot: {
        token: process.env.BOT_TOKEN,
        username: process.env.BOT_USERNAME,
        ownerId: process.env.OWNER_ID,
        supportChannel: process.env.SUPPORT_CHANNEL,
        supportChat: process.env.SUPPORT_CHAT,
        startImage: process.env.START_IMAGE,
        loggerGroupId: process.env.LOGGER_GROUP_ID
    },

    // Server Configuration
    server: {
        port: process.env.PORT || 3001,
        webhookUrl: process.env.WEBHOOK_URL,
        frontendUrl: process.env.FRONTEND_URL,
        webPlayerUrl: process.env.WEB_PLAYER_URL
    },

    // App Settings
    app: {
        defaultLang: process.env.DEFAULT_LANG || 'en',
        autoDeleteTime: 20000, // 20 seconds
        corsOrigins: process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',')
            : [
                'http://localhost:3000',
                'http://localhost:5173',
                /\.vercel\.app$/ // Allow all Vercel preview deployments
            ]
    },

    // Redis Configuration
    redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    }
};

// Validate required config
if (!config.bot.token) {
    console.error('❌ BOT_TOKEN missing');
    process.exit(1);
}

module.exports = config;
