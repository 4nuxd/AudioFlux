const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * Proxy endpoint for YouTube videos
 * Streams video from YouTube API server with proper CORS and Range headers
 */
router.get('/youtube-video', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        console.log('[Proxy] Streaming YouTube video:', url);

        // Get range header from client request
        const range = req.headers.range;

        // Make request to YouTube API server
        const headers = {};
        if (range) {
            headers.Range = range;
        }

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: headers
        });

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');

        // Forward content headers
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');

        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        if (response.headers['content-range']) {
            res.setHeader('Content-Range', response.headers['content-range']);
            res.status(206); // Partial Content
        }

        if (response.headers['accept-ranges']) {
            res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
        } else {
            res.setHeader('Accept-Ranges', 'bytes');
        }

        // Pipe the video stream to response
        response.data.pipe(res);

        response.data.on('error', (error) => {
            console.error('[Proxy] Stream error:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error' });
            }
        });

    } catch (error) {
        console.error('[Proxy] Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Handle OPTIONS for CORS preflight
router.options('/youtube-video', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.status(200).end();
});

/**
 * Serve downloaded YouTube video files
 */
router.get('/youtube-file/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const fs = require('fs');
        const path = require('path');

        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filepath = path.join('/tmp/youtube-videos', filename);

        // Check if file exists
        if (!fs.existsSync(filepath)) {
            console.error('[Proxy] File not found:', filepath);
            return res.status(404).json({ error: 'File not found' });
        }

        console.log('[Proxy] Serving file:', filepath);

        // Get file stats for Content-Length
        const stat = fs.statSync(filepath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'video/mp4');

        if (range) {
            // Handle range request for seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', chunksize);

            const stream = fs.createReadStream(filepath, { start, end });
            stream.pipe(res);
        } else {
            // Send entire file
            res.setHeader('Content-Length', fileSize);
            res.setHeader('Accept-Ranges', 'bytes');

            const stream = fs.createReadStream(filepath);
            stream.pipe(res);
        }

    } catch (error) {
        console.error('[Proxy] Error serving file:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
