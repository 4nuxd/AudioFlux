require('dotenv').config();

// Polyfill for File API (required for cheerio/undici on Node.js 18)
if (typeof File === 'undefined') {
    global.File = class File {
        constructor(bits, name, options) {
            this.bits = bits;
            this.name = name;
            this.options = options || {};
            this.type = this.options.type || '';
            this.lastModified = this.options.lastModified || Date.now();
        }
    };
}

const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

// Config and middleware
const config = require('./config');
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');

// Services
const telegramService = require('./services/telegramService');

// Routes
const searchRoutes = require('./routes/search');
const queueRoutes = require('./routes/queue');
const apiRoutes = require('./routes/api');
const validationRoutes = require('./routes/validation');
const statsRoutes = require('./routes/stats');

// Socket handler
const SocketHandler = require('./socket/socketHandler');

// Logger
const logger = require('./logger');
const compression = require('compression');

// ========== Express Setup ==========
const app = express();

// Enable compression for all responses
app.use(compression({
    level: 6, // Balance between speed and compression
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Middleware
app.use(corsMiddleware);
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));

// Disable x-powered-by header for security
app.disable('x-powered-by');

// Trust proxy (for Railway/Render)
app.set('trust proxy', 1);

// Health check endpoints (cached for 10 seconds)
app.get('/ping', (req, res) => {
    res.set('Cache-Control', 'public, max-age=10');
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.get('/health', (req, res) => {
    res.set('Cache-Control', 'public, max-age=10');
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Routes
app.use('/search', searchRoutes);
app.use('/api/search', searchRoutes); // Frontend expects /api/search
app.use('/', queueRoutes);
app.use('/api', apiRoutes);
app.use('/', validationRoutes);
app.use('/api/stats', statsRoutes); // Stats API for frontend
app.use('/api/proxy', require('./routes/proxy')); // YouTube video proxy
app.use('/api/notifications', require('./routes/notifications')); // Notifications API
app.use('/api/playlist', require('./routes/playlist')); // Playlist API
app.use('/api/lyrics', require('./routes/lyrics')); // Lyrics API (Genius + lyrics.ovh)
app.use('/api/winter-mode', require('./routes/winterMode')); // Winter mode toggle
app.use('/health', require('./routes/health')); // Health check routes (Heroku monitoring)

// Telegram webhook endpoint
app.post('/bot/webhook', (req, res) => {
    // Acknowledge receipt immediately to prevent Telegram retries
    res.sendStatus(200);

    // Process update asynchronously
    bot.handleUpdate(req.body).catch(err => {
        console.error('❌ Webhook handler error:', err);
        logger.error('webhook_handler_error', { error: err.message, stack: err.stack });
    });
});

// Error handler (must be last)
app.use(errorHandler);

// ========== HTTP Server ==========
const server = http.createServer(app);

// ========== Socket.IO Setup ==========
const io = new Server(server, {
    cors: {
        origin: config.app.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Initialize socket handler
new SocketHandler(io);

// Initialize playback manager
const PlaybackManager = require('./services/playbackManager');
global.playbackManager = new PlaybackManager(io);

// Export io for use in other modules if needed
global.io = io;

// ========== Telegram Bot Setup ==========
const bot = telegramService.getBot();

// Load bot modules (commands, callbacks, events, middleware)
require('./bot');

// ========== Start Server ==========
const PORT = config.server.port;

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    logger.info('server_started', { port: PORT });
});

// Set webhook or use polling
if (config.server.webhookUrl) {
    const webhookPath = `${config.server.webhookUrl.replace(/\/$/, '')}/bot/webhook`;
    bot.telegram.setWebhook(webhookPath)
        .then(() => {
            console.log(`✅ Webhook set to ${webhookPath}`);
            logger.info('webhook_set', { url: webhookPath });
        })
        .catch(err => {
            console.error('❌ Failed to set webhook:', err);
            logger.error('webhook_set_error', { error: err.message });
        });
} else {
    bot.launch()
        .then(() => {
            console.log('✅ Bot started with polling');
            logger.info('bot_started_polling');
        })
        .catch(err => {
            console.error('❌ Failed to start bot:', err);
            logger.error('bot_start_error', { error: err.message });
        });
}

// ========== Memory Optimization ==========
// Monitor memory usage and trigger GC if needed
if (global.gc) {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

        // If heap usage > 80%, trigger garbage collection
        if (heapUsedMB / heapTotalMB > 0.8) {
            console.log(`[Memory] High usage detected: ${heapUsedMB}MB/${heapTotalMB}MB - Running GC`);
            global.gc();
        }
    }, 30000); // Check every 30 seconds
}

// Log memory usage periodically
setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log('[Memory]', {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    });
}, 300000); // Log every 5 minutes

// Graceful shutdown with cleanup
process.once('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    bot.stop('SIGINT');
    server.close(() => {
        console.log('Server closed');
        // Close Redis connection
        const { client } = require('./redis');
        client.quit(() => {
            console.log('Redis connection closed');
            process.exit(0);
        });
    });
});

process.once('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    bot.stop('SIGTERM');
    server.close(() => {
        console.log('Server closed');
        // Close Redis connection
        const { client } = require('./redis');
        client.quit(() => {
            console.log('Redis connection closed');
            process.exit(0);
        });
    });
});

module.exports = { app, server, io, bot };
