/**
 * Health Check Routes
 * Provides comprehensive health status including Heroku components
 */

const express = require('express');
const router = express.Router();
const herokuHealthService = require('../services/herokuHealthService');
const { client } = require('../redis');
const logger = require('../logger');

// Owner authentication middleware - requires BOTH user ID and bot token
const OWNER_ID = process.env.OWNER_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;

function requireOwner(req, res, next) {
    // Check user ID
    const userId = req.query.userId || req.headers['x-user-id'];

    // Check bot token (from Authorization header or query param)
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;
    const token = tokenFromHeader || req.query.token;

    // Both must be valid
    if (!userId || userId !== OWNER_ID) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid or missing user ID'
        });
    }

    if (!token || token !== BOT_TOKEN) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid or missing bot token'
        });
    }

    next();
}

/**
 * GET /health/heroku
 * Full Heroku health status (detailed) - OWNER ONLY
 */
router.get('/heroku', requireOwner, async (req, res) => {
    try {
        const healthStatus = await herokuHealthService.getHerokuHealthStatus();
        res.json(healthStatus);
    } catch (error) {
        logger.error('heroku_health_check_error', { error: error.message });
        res.status(500).json({
            error: 'Failed to fetch Heroku health status',
            message: error.message
        });
    }
});

/**
 * GET /health/heroku/summary
 * Simplified Heroku health summary - OWNER ONLY
 */
router.get('/heroku/summary', requireOwner, async (req, res) => {
    try {
        const summary = await herokuHealthService.getHealthSummary();
        res.json(summary);
    } catch (error) {
        logger.error('heroku_health_summary_error', { error: error.message });
        res.status(500).json({
            error: 'Failed to fetch Heroku health summary',
            message: error.message
        });
    }
});

/**
 * GET /health/full
 * Complete health check including local services and Heroku
 */
router.get('/full', async (req, res) => {
    try {
        const startTime = Date.now();

        // Check Redis
        let redisStatus = 'unknown';
        let redisLatency = null;
        try {
            const redisStart = Date.now();
            await client.ping();
            redisLatency = Date.now() - redisStart;
            redisStatus = 'connected';
        } catch (error) {
            redisStatus = 'disconnected';
            logger.error('redis_health_check_failed', { error: error.message });
        }

        // Check Telegram Bot
        let botStatus = 'unknown';
        try {
            const { bot } = require('../server');
            const botInfo = await bot.telegram.getMe();
            botStatus = botInfo ? 'connected' : 'disconnected';
        } catch (error) {
            botStatus = 'disconnected';
            logger.error('bot_health_check_failed', { error: error.message });
        }

        // Get Heroku status
        let herokuStatus = null;
        try {
            herokuStatus = await herokuHealthService.getHealthSummary();
        } catch (error) {
            logger.error('heroku_health_check_failed', { error: error.message });
            herokuStatus = { error: error.message };
        }

        // Memory usage
        const memUsage = process.memoryUsage();
        const memory = {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        };

        const responseTime = Date.now() - startTime;

        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            services: {
                redis: {
                    status: redisStatus,
                    latency: redisLatency ? `${redisLatency}ms` : null
                },
                telegramBot: {
                    status: botStatus
                }
            },
            memory: memory,
            environment: process.env.NODE_ENV || 'production',
            nodeVersion: process.version,
            platform: process.platform,
            heroku: herokuStatus
        };

        // Determine overall status
        if (redisStatus !== 'connected' || botStatus !== 'connected') {
            healthData.status = 'degraded';
        }

        if (herokuStatus?.overall === 'degraded') {
            healthData.status = 'degraded';
        }

        res.json(healthData);
    } catch (error) {
        logger.error('full_health_check_error', { error: error.message });
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /health/basic
 * Basic health check (fast, minimal)
 */
router.get('/basic', async (req, res) => {
    try {
        // Quick Redis ping
        await client.ping();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
