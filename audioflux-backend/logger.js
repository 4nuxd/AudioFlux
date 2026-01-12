// logger.js - Centralized logging system for the bot
const fs = require('fs');
const path = require('path');
const os = require('os');

let LOG_DIR;
let LOG_FILE;
let fileLoggingEnabled = false;

try {
  // Try to use OS temp directory for logs
  LOG_DIR = path.join(os.tmpdir(), 'telegram-bot-logs');
  fs.mkdirSync(LOG_DIR, { recursive: true });
  LOG_FILE = path.join(LOG_DIR, 'bot.log');
  fileLoggingEnabled = true;
} catch (err) {
  // If file system access fails, disable file logging
  console.warn('[Logger] File logging disabled due to permissions. Using in-memory only.');
  fileLoggingEnabled = false;
}

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LOGS = 10; // Keep 10 log files

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000; // Keep last 10k logs in memory
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    this.logs.push(logEntry);

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Write to file if enabled
    if (fileLoggingEnabled) {
      this._writeToFile(logEntry);
    }

    // Console output
    const logMsg = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
    if (level === 'ERROR') {
      console.error(logMsg);
    } else {
      console.log(logMsg);
    }
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  command(commandName, userId, chatId, args = null) {
    this.info(`COMMAND: /${commandName}`, { userId, chatId, args });
  }

  action(actionName, userId, chatId, details = null) {
    this.info(`ACTION: ${actionName}`, { userId, chatId, ...details });
  }

  search(query, userId, chatId, resultsCount = 0) {
    this.info(`SEARCH: "${query}"`, { userId, chatId, resultsCount });
  }

  song(action, groupId, songTitle, userId) {
    this.info(`SONG: ${action}`, { groupId, songTitle, userId });
  }

  // ========== NEW: Rate Limiting Logs ==========
  rateLimit(action, userId, status, details = {}) {
    this.info(`RATE_LIMIT: ${action}`, { userId, status, ...details });
  }

  rateLimitHit(userId, action, resetIn) {
    this.warn(`RATE_LIMIT_HIT: User rate limited`, { userId, action, resetIn });
  }

  rateLimitFreed(userId, freedBy) {
    this.info(`RATE_LIMIT_FREED: User exempted from limits`, { userId, freedBy });
  }

  rateLimitApplied(userId, appliedBy) {
    this.info(`RATE_LIMIT_APPLIED: User rate limited`, { userId, appliedBy });
  }

  // ========== NEW: Performance Logs ==========
  performance(metric, value, details = {}) {
    this.info(`PERFORMANCE: ${metric}`, { value, ...details });
  }

  compression(originalSize, compressedSize, ratio) {
    this.debug(`COMPRESSION: ${ratio}% reduction`, { originalSize, compressedSize });
  }

  redisConnection(action, details = {}) {
    this.info(`REDIS: ${action}`, details);
  }

  memoryUsage(heapUsed, heapTotal, rss) {
    this.debug(`MEMORY: Heap ${heapUsed}MB/${heapTotal}MB, RSS ${rss}MB`, { heapUsed, heapTotal, rss });
  }

  // ========== NEW: Optimization Logs ==========
  optimization(type, improvement, details = {}) {
    this.info(`OPTIMIZATION: ${type}`, { improvement, ...details });
  }

  cacheHit(key, type = 'general') {
    this.debug(`CACHE_HIT: ${type}`, { key });
  }

  cacheMiss(key, type = 'general') {
    this.debug(`CACHE_MISS: ${type}`, { key });
  }

  getLogs(level = null, limit = 500, offset = 0) {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }

    return filtered.slice(Math.max(0, filtered.length - offset - limit), filtered.length - offset);
  }

  exportLogs(limit = 500) {
    const filtered = this.logs.slice(-limit);
    return filtered.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const data = log.data ? ` | ${JSON.stringify(log.data)}` : '';
      return `[${time}] ${log.level}: ${log.message}${data}`;
    }).join('\n');
  }

  _writeToFile(logEntry) {
    if (!fileLoggingEnabled) return;

    try {
      // Check if log file exists and its size
      if (fs.existsSync(LOG_FILE)) {
        const stats = fs.statSync(LOG_FILE);
        if (stats.size > MAX_LOG_SIZE) {
          this._rotateLogFile();
        }
      }

      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(LOG_FILE, logLine);
    } catch (e) {
      // Silently fail - don't crash the bot
    }
  }

  _rotateLogFile() {
    if (!fileLoggingEnabled) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivedFile = path.join(LOG_DIR, `bot.${timestamp}.log`);
      fs.renameSync(LOG_FILE, archivedFile);

      // Clean old logs if more than MAX_LOGS
      const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('bot.'));
      if (files.length > MAX_LOGS) {
        const oldestFile = files.sort()[0];
        fs.unlinkSync(path.join(LOG_DIR, oldestFile));
      }
    } catch (e) {
      // Silently fail rotation
    }
  }

  clearLogs() {
    this.logs = [];
    if (fileLoggingEnabled && fs.existsSync(LOG_FILE)) {
      try {
        fs.unlinkSync(LOG_FILE);
      } catch (e) {
        // Silently fail
      }
    }
  }
}

module.exports = new Logger();
