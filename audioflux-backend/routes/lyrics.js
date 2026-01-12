/**
 * Lyrics API Routes
 */

const express = require('express');
const router = express.Router();
const lyricsService = require('../services/lyricsService');

/**
 * GET /api/lyrics/search
 * Search for song lyrics
 */
router.get('/search', async (req, res) => {
    try {
        const { title, artist } = req.query;

        if (!title || !artist) {
            return res.status(400).json({
                error: 'Missing required parameters: title and artist'
            });
        }

        const song = await lyricsService.searchSong(title, artist);

        if (!song) {
            return res.status(404).json({
                error: 'Song not found'
            });
        }

        res.json({
            id: song.id,
            title: song.title,
            artist: song.primary_artist.name,
            albumArt: song.song_art_image_url,
            url: song.url
        });
    } catch (error) {
        console.error('[Lyrics] Search error:', error);
        res.status(500).json({
            error: 'Failed to search for lyrics'
        });
    }
});

/**
 * GET /api/lyrics/jiosaavn/:songId
 * Get lyrics from JioSaavn by song ID
 */
router.get('/jiosaavn/:songId', async (req, res) => {
    try {
        const { songId } = req.params;

        if (!songId) {
            return res.status(400).json({
                error: 'Missing required parameter: songId'
            });
        }

        const lyricsData = await lyricsService.getLyricsFromJioSaavn(songId);

        if (!lyricsData) {
            return res.status(404).json({
                error: 'Lyrics not found for this song'
            });
        }

        res.json({
            songId,
            lyrics: lyricsData.lyrics,
            source: lyricsData.source,
            synced: lyricsData.synced
        });
    } catch (error) {
        console.error('[Lyrics] JioSaavn fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch lyrics from JioSaavn'
        });
    }
});

/**
 * GET /api/lyrics/:artist/:title
 * Get lyrics for a song (tries multiple sources)
 * Query params: songId (optional JioSaavn song ID for better results)
 */
router.get('/:artist/:title', async (req, res) => {
    try {
        const { artist, title } = req.params;
        const { songId } = req.query; // Optional JioSaavn song ID

        const lyricsData = await lyricsService.getSyncedLyrics(artist, title, songId);

        if (!lyricsData) {
            return res.status(404).json({
                error: 'Lyrics not found'
            });
        }

        res.json({
            artist,
            title,
            lyrics: lyricsData.lyrics,
            synced: lyricsData.synced,
            source: lyricsData.source,
            url: lyricsData.url || null
        });
    } catch (error) {
        console.error('[Lyrics] Fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch lyrics'
        });
    }
});

module.exports = router;
