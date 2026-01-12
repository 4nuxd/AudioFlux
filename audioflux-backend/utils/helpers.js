const config = require('../config');

/**
 * Group control keyboard for inline messages
 */
function groupControlKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '▶️ Play', callback_data: 'play' },
                { text: '⏸ Pause', callback_data: 'pause' },
                { text: '⏭ Skip', callback_data: 'skip' }
            ],
            [
                { text: '📄 Queue', callback_data: 'queue' },
                { text: '🎧 Player', callback_data: 'open_player' }
            ]
        ]
    };
}

/**
 * Extract @username handle from https://t.me/xxx URL
 */
function extractHandleFromUrl(url) {
    try {
        if (!url) return null;
        const u = new URL(url);
        let path = u.pathname.replace('/', '').trim();
        if (!path || path.startsWith('+')) return null; // invite link or invalid
        return '@' + path;
    } catch {
        return null;
    }
}

/**
 * Get support channel and chat handles
 */
const SUPPORT_CHANNEL_HANDLE = extractHandleFromUrl(config.bot.supportChannel);
const SUPPORT_CHAT_HANDLE = extractHandleFromUrl(config.bot.supportChat);

/**
 * Shift queue if current song matches
 * If queue's first element matches currentSong.id, shift it and persist
 * Returns updated queue
 */
async function shiftQueueIfCurrentSongMatches(gid, currentSong) {
    if (!currentSong || !currentSong.id) return null;

    const { getQueue, setQueue } = require('../redis');

    try {
        const queue = (await getQueue(gid)) || [];
        if (queue && queue.length && queue[0].id === currentSong.id) {
            queue.shift();
            await setQueue(gid, queue);
            return queue;
        }
        return queue;
    } catch (e) {
        console.error('[Helpers] shiftQueueIfCurrentSongMatches error', e);
        return null;
    }
}

/**
 * Format duration from seconds to MM:SS
 */
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get user display name
 */
function getUserDisplayName(user) {
    if (user.username) return `@${user.username}`;
    if (user.firstName) return user.firstName;
    if (user.name) return user.name;
    return 'User';
}

/**
 * Create deep link for room
 */
function createRoomDeepLink(roomId) {
    return `https://t.me/${config.bot.username}?startapp=room_${roomId}`;
}

/**
 * Create web player URL for room
 */
function createWebPlayerUrl(roomId) {
    return `${config.server.webPlayerUrl}?room=${roomId}`;
}

module.exports = {
    groupControlKeyboard,
    extractHandleFromUrl,
    SUPPORT_CHANNEL_HANDLE,
    SUPPORT_CHAT_HANDLE,
    shiftQueueIfCurrentSongMatches,
    formatDuration,
    getUserDisplayName,
    createRoomDeepLink,
    createWebPlayerUrl
};
