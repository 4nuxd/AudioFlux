/**
 * Bot Module - Clean Implementation
 * 
 * This is the main bot module that loads all bot functionality.
 * All bot features are organized into clean, modular files.
 */

const telegramService = require('../services/telegramService');
const bot = telegramService.getBot();
const rateLimiter = require('../middleware/rateLimiter');

console.log('[Bot] Initializing bot module...');

// Apply rate limiting to all commands (20 commands/minute per user)
bot.use(rateLimiter.middleware('commands'));

// Load bot components in order
require('./middleware');      // Ban/approval + force-join middleware
require('./events');          // Bot events (welcome, tracking)
require('./commands');        // All bot commands
require('./callbacks');       // All bot callbacks
require('./adminCommands');   // Admin commands (ban, approve, history)
require('./ownerStats');      // Owner stats (stats, speedtest, reboot) + analytics
require('./ownerCmd')(bot);   // Owner command execution (/cmd, /exec)
require('./roomCommands');    // Private room management commands
require('./helpSystem');      // Enhanced categorized help system

console.log('[Bot] ✅ Bot module loaded successfully');

module.exports = bot;
