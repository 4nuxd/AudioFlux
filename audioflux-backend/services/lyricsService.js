/**
 * Lyrics Service - Multi-source Lyrics Integration
 * Fetches lyrics from JioSaavn (primary) with Genius fallback
 */

const axios = require('axios');
const logger = require('../logger');

const GENIUS_API_KEY = process.env.GENIUS_API_KEY;
const GENIUS_API_BASE = 'https://api.genius.com';
const JIOSAAVN_API_BASE = 'https://www.jiosaavn.com/api.php';

/**
 * Clean HTML entities from lyrics
 */
function cleanLyrics(lyrics) {
    if (!lyrics) return null;

    return lyrics
        .replace(/<br>/g, '\n')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

/**
 * Get lyrics from JioSaavn by song ID
 */
async function getLyricsFromJioSaavn(songId) {
    try {
        const response = await axios.get(JIOSAAVN_API_BASE, {
            params: {
                __call: 'lyrics.getLyrics',
                lyrics_id: songId,
                ctx: 'web6dot0',
                api_version: '4',
                _format: 'json',
                _marker: '0'
            },
            timeout: 10000
        });

        if (response.data) {
            const lyrics = response.data.lyrics ||
                response.data.lyrics_text ||
                response.data.snippet;

            if (lyrics) {
                return {
                    lyrics: cleanLyrics(lyrics),
                    source: 'jiosaavn',
                    synced: false
                };
            }
        }

        return null;
    } catch (error) {
        logger.error('jiosaavn_lyrics_error', {
            songId,
            error: error.message
        });
        return null;
    }
}

/**
 * Search for song on Genius
 */
async function searchSong(title, artist) {
    try {
        if (!GENIUS_API_KEY) {
            throw new Error('GENIUS_API_KEY not configured');
        }

        const query = `${title} ${artist}`.trim();
        const response = await axios.get(`${GENIUS_API_BASE}/search`, {
            params: { q: query },
            headers: {
                'Authorization': `Bearer ${GENIUS_API_KEY}`
            }
        });

        const hits = response.data.response.hits;
        if (hits.length === 0) {
            return null;
        }

        // Return the first (best) match
        return hits[0].result;
    } catch (error) {
        logger.error('lyrics_search_error', {
            title,
            artist,
            error: error.message
        });
        return null;
    }
}

/**
 * Get lyrics for a song
 * Note: Genius API doesn't provide lyrics directly, only metadata
 * You'll need to scrape the lyrics page or use a third-party service
 */
async function getLyrics(songId) {
    try {
        // For now, return song metadata
        // In production, you'd scrape the lyrics page or use a service like lyrics.ovh
        const response = await axios.get(`${GENIUS_API_BASE}/songs/${songId}`, {
            headers: {
                'Authorization': `Bearer ${GENIUS_API_KEY}`
            }
        });

        const song = response.data.response.song;

        return {
            id: song.id,
            title: song.title,
            artist: song.primary_artist.name,
            albumArt: song.song_art_image_url,
            url: song.url,
            // Lyrics would be fetched from lyrics.ovh or similar
            lyrics: null
        };
    } catch (error) {
        logger.error('lyrics_fetch_error', {
            songId,
            error: error.message
        });
        return null;
    }
}

/**
 * Get lyrics from lyrics.ovh (free alternative)
 */
async function getLyricsFromOvh(artist, title) {
    try {
        const response = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
        );

        if (response.data && response.data.lyrics) {
            return {
                lyrics: response.data.lyrics,
                source: 'lyrics.ovh'
            };
        }

        return null;
    } catch (error) {
        logger.error('lyrics_ovh_error', {
            artist,
            title,
            error: error.message
        });
        return null;
    }
}

/**
 * Get synchronized lyrics (if available)
 * Tries multiple sources: JioSaavn -> Genius -> lyrics.ovh
 */
async function getSyncedLyrics(artist, title, songId = null) {
    try {
        // 1. Try JioSaavn if songId is provided
        if (songId) {
            logger.info('lyrics_fetch_attempt', {
                source: 'jiosaavn',
                songId,
                artist,
                title
            });

            const jioSaavnLyrics = await getLyricsFromJioSaavn(songId);
            if (jioSaavnLyrics) {
                // Parse lyrics into lines for synced format
                const lines = jioSaavnLyrics.lyrics.split('\n').filter(line => line.trim());
                const syncedLines = lines.map((text, index) => ({
                    time: index * 3, // seconds (approximate)
                    text: text.trim()
                }));

                return {
                    lyrics: syncedLines,
                    source: 'jiosaavn',
                    synced: false
                };
            }
        }

        // 2. Try lyrics.ovh (works well for English songs)
        logger.info('lyrics_fetch_attempt', {
            source: 'lyrics.ovh',
            artist,
            title
        });

        const lyricsData = await getLyricsFromOvh(artist, title);

        if (lyricsData) {
            // Parse lyrics into lines
            const lines = lyricsData.lyrics.split('\n').filter(line => line.trim());

            // Create synced format with approximate timestamps
            const syncedLines = lines.map((text, index) => ({
                time: index * 3, // seconds
                text: text.trim()
            }));

            return {
                lyrics: syncedLines,
                source: lyricsData.source,
                synced: false
            };
        }

        // 3. Try Genius as last resort (requires API key)
        if (GENIUS_API_KEY) {
            logger.info('lyrics_fetch_attempt', {
                source: 'genius',
                artist,
                title
            });

            const geniusSong = await searchSong(title, artist);
            if (geniusSong) {
                // Note: Genius API doesn't provide lyrics directly
                // You'd need to scrape or use another service
                return {
                    lyrics: [{
                        time: 0,
                        text: `Lyrics available at: ${geniusSong.url}`
                    }],
                    source: 'genius',
                    synced: false,
                    url: geniusSong.url
                };
            }
        }

        return null;
    } catch (error) {
        logger.error('synced_lyrics_error', {
            artist,
            title,
            songId,
            error: error.message
        });
        return null;
    }
}

module.exports = {
    searchSong,
    getLyrics,
    getLyricsFromOvh,
    getLyricsFromJioSaavn,
    getSyncedLyrics
};
