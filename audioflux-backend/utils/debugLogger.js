/**
 * Debug Logger - Comprehensive logging utility
 * Provides detailed, formatted console logs for debugging
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m'
};

class DebugLogger {
    constructor() {
        this.enabled = process.env.DEBUG_LOGS === 'true' || process.env.NODE_ENV === 'development';
    }

    formatTimestamp() {
        return new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: false
        });
    }

    formatObject(obj) {
        if (!obj) return '';
        try {
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    }

    log(category, message, data = null) {
        if (!this.enabled) return;

        const timestamp = this.formatTimestamp();
        const categoryColor = this.getCategoryColor(category);

        console.log(
            `${colors.dim}[${timestamp}]${colors.reset} ` +
            `${categoryColor}[${category.toUpperCase()}]${colors.reset} ` +
            `${colors.bright}${message}${colors.reset}`
        );

        if (data) {
            console.log(`${colors.cyan}${this.formatObject(data)}${colors.reset}`);
        }
    }

    getCategoryColor(category) {
        const colorMap = {
            'bot': colors.blue,
            'api': colors.green,
            'socket': colors.magenta,
            'search': colors.yellow,
            'queue': colors.cyan,
            'error': colors.red,
            'warn': colors.yellow,
            'success': colors.green,
            'command': colors.blue,
            'callback': colors.magenta,
            'webhook': colors.cyan
        };

        return colorMap[category.toLowerCase()] || colors.white;
    }

    // Specific log methods
    bot(message, data) {
        this.log('BOT', message, data);
    }

    api(message, data) {
        this.log('API', message, data);
    }

    socket(message, data) {
        this.log('SOCKET', message, data);
    }

    search(message, data) {
        this.log('SEARCH', message, data);
    }

    queue(message, data) {
        this.log('QUEUE', message, data);
    }

    command(commandName, userId, chatId, args = null) {
        this.log('COMMAND', `/${commandName}`, {
            userId,
            chatId,
            args
        });
    }

    callback(callbackData, userId, chatId) {
        this.log('CALLBACK', callbackData, {
            userId,
            chatId
        });
    }

    error(message, error) {
        this.log('ERROR', message, {
            message: error?.message,
            stack: error?.stack,
            ...error
        });
    }

    warn(message, data) {
        this.log('WARN', message, data);
    }

    success(message, data) {
        this.log('SUCCESS', message, data);
    }

    webhook(message, data) {
        this.log('WEBHOOK', message, data);
    }
}

module.exports = new DebugLogger();
