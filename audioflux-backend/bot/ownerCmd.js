/**
 * Owner Command Execution
 * Allows bot owner to execute shell commands remotely via Telegram
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../logger');

const OWNER_ID = process.env.OWNER_ID;

// Helper to check if user is owner
function isOwner(userId) {
    return userId.toString() === OWNER_ID;
}

module.exports = (bot) => {
    /**
     * /cmd <command> - Execute shell command (owner only)
     * Example: /cmd ls -la
     * Example: /cmd pm2 status
     * Example: /cmd df -h
     */
    bot.command('cmd', async (ctx) => {
        try {
            if (!isOwner(ctx.from.id)) {
                return ctx.reply('❌ You are not authorized to use this command.');
            }

            const command = ctx.message.text.split(' ').slice(1).join(' ');

            if (!command || command.trim() === '') {
                return ctx.reply(
                    '⚠️ *Usage:* `/cmd <command>`\n\n' +
                    '*Examples:*\n' +
                    '• `/cmd ls -la`\n' +
                    '• `/cmd pm2 status`\n' +
                    '• `/cmd df -h`\n' +
                    '• `/cmd free -m`\n' +
                    '• `/cmd uptime`',
                    { parse_mode: 'Markdown' }
                );
            }

            // Security check - prevent dangerous commands
            const dangerousPatterns = [
                /rm\s+-rf\s+\//,  // rm -rf /
                /:\(\)\{.*\};:/,   // Fork bomb
                /mkfs/,            // Format filesystem
                /dd\s+if=/,        // Disk operations
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(command)) {
                    return ctx.reply('🚫 *Dangerous command blocked!*\n\nThis command could harm the system.', {
                        parse_mode: 'Markdown'
                    });
                }
            }

            // Send "executing" message
            const executingMsg = await ctx.reply(
                `⏳ *Executing command...*\n\n\`${command}\``,
                { parse_mode: 'Markdown' }
            );

            logger.info('owner_cmd_executed', {
                userId: ctx.from.id,
                command: command
            });

            // Execute command with timeout
            const startTime = Date.now();
            try {
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 30000, // 30 second timeout
                    maxBuffer: 1024 * 1024 * 5 // 5MB buffer
                });

                const executionTime = Date.now() - startTime;
                const output = stdout || stderr || '(no output)';

                // Truncate if too long
                const maxLength = 3500;
                const truncated = output.length > maxLength;
                const displayOutput = truncated
                    ? output.substring(0, maxLength) + '\n... (truncated)'
                    : output;

                // Format as JSON
                const result = {
                    success: true,
                    command: command,
                    executionTime: `${executionTime}ms`,
                    output: displayOutput,
                    truncated: truncated
                };

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    executingMsg.message_id,
                    null,
                    `✅ *Command Executed*\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
                    { parse_mode: 'Markdown' }
                );

            } catch (error) {
                const executionTime = Date.now() - startTime;
                const errorOutput = error.stderr || error.stdout || error.message;

                // Truncate error if too long
                const maxLength = 3500;
                const truncated = errorOutput.length > maxLength;
                const displayError = truncated
                    ? errorOutput.substring(0, maxLength) + '\n... (truncated)'
                    : errorOutput;

                // Format error as JSON
                const result = {
                    success: false,
                    command: command,
                    executionTime: `${executionTime}ms`,
                    exitCode: error.code || 'unknown',
                    error: displayError,
                    truncated: truncated
                };

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    executingMsg.message_id,
                    null,
                    `❌ *Command Failed*\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
                    { parse_mode: 'Markdown' }
                );

                logger.error('owner_cmd_failed', {
                    userId: ctx.from.id,
                    command: command,
                    error: error.message,
                    exitCode: error.code
                });
            }

        } catch (e) {
            console.error('[CMD] Error:', e);
            ctx.reply('❌ Error executing command: ' + e.message);
        }
    });

    /**
     * /exec <command> - Alias for /cmd
     */
    bot.command('exec', async (ctx) => {
        // Just redirect to /cmd handler
        ctx.message.text = ctx.message.text.replace('/exec', '/cmd');
        return bot.handleUpdate({ message: ctx.message });
    });

    console.log('[Bot] ✅ Owner command execution loaded');
};
