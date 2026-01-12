/**
 * Rate Limiter Middleware for Bot Commands
 * Prevents spam and abuse
 */

const { client } = require('../redis');
const logger = require('../logger');

class RateLimiter {
    constructor() {
        // Rate limit settings per user
        this.limits = {
            // Commands per minute
            commands: { max: 20, window: 60 },
            // Songs added per minute
            addSong: { max: 10, window: 60 },
            // Search queries per minute
            search: { max: 15, window: 60 }
        };
        logger.info('RateLimiter initialized', { limits: this.limits });
    }

    /**
     * Check if user is whitelisted (exempt from rate limiting)
     */
    async isWhitelisted(userId) {
        const key = `ratelimit:whitelist:${userId}`;
        const whitelisted = await client.get(key);
        return whitelisted === '1';
    }

    /**
     * Add user to whitelist (exempt from rate limiting)
     */
    async whitelist(userId) {
        const key = `ratelimit:whitelist:${userId}`;
        await client.set(key, '1');
        logger.rateLimitFreed(userId, 'owner');
    }

    /**
     * Remove user from whitelist (apply rate limiting)
     */
    async unwhitelist(userId) {
        const key = `ratelimit:whitelist:${userId}`;
        await client.del(key);
        logger.rateLimitApplied(userId, 'owner');
    }

    /**
     * Check if user is rate limited
     * @param {string} userId - User ID
     * @param {string} action - Action type (commands, addSong, search)
     * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
     */
    async checkLimit(userId, action = 'commands') {
        // Check if whitelisted
        if (await this.isWhitelisted(userId)) {
            logger.rateLimit('check', userId, 'whitelisted', { action });
            return { allowed: true, remaining: 999, resetIn: 0, whitelisted: true };
        }

        const limit = this.limits[action] || this.limits.commands;
        const key = `ratelimit:${action}:${userId}`;

        try {
            // Get current count
            const current = await client.get(key);
            const count = current ? parseInt(current) : 0;

            if (count >= limit.max) {
                // Rate limited
                const ttl = await client.ttl(key);
                logger.rateLimitHit(userId, action, ttl);
                return {
                    allowed: false,
                    remaining: 0,
                    resetIn: ttl > 0 ? ttl : limit.window,
                    whitelisted: false
                };
            }

            // Increment counter
            const newCount = await client.incr(key);

            // Set expiry on first request
            if (newCount === 1) {
                await client.expire(key, limit.window);
            }

            logger.rateLimit('check', userId, 'allowed', { action, remaining: limit.max - newCount });
            return {
                allowed: true,
                remaining: limit.max - newCount,
                resetIn: limit.window,
                whitelisted: false
            };
        } catch (error) {
            logger.error('rate_limit_check_error', { userId, action, error: error.message });
            // On error, allow the request (fail open)
            return { allowed: true, remaining: limit.max, resetIn: limit.window, whitelisted: false };
        }
    }

    /**
     * Middleware for Telegraf bot
     */
    middleware(action = 'commands') {
        return async (ctx, next) => {
            const userId = ctx.from?.id;

            if (!userId) {
                return next();
            }

            // Owner is always exempt from rate limiting
            const OWNER_ID = process.env.OWNER_ID;
            if (OWNER_ID && userId.toString() === OWNER_ID) {
                logger.rateLimit('check', userId, 'owner_exempt', { action });
                return next();
            }

            const result = await this.checkLimit(userId, action);

            if (!result.allowed) {
                const minutes = Math.ceil(result.resetIn / 60);
                await ctx.reply(
                    `⏱ *Slow down!*\\n\\n` +
                    `You're sending commands too fast.\\n` +
                    `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            return next();
        };
    }

    /**
     * Reset rate limit for a user
     */
    async reset(userId, action = 'commands') {
        const key = `ratelimit:${action}:${userId}`;
        await client.del(key);
        logger.rateLimit('reset', userId, 'cleared', { action });
    }
}

module.exports = new RateLimiter();
