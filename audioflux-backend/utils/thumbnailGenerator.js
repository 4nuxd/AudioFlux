/**
 * Simple Thumbnail Handler - Uses Original Thumbnails
 * No generation, just returns original thumbnail URL
 */

/**
 * Get original thumbnail (no generation)
 */
async function generateSongThumbnail(song, state = 'playing') {
    // Simply return null - let Telegram use the original thumbnail
    return null;
}

module.exports = {
    generateSongThumbnail
};
