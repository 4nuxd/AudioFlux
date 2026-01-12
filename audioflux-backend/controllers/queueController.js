const queueService = require('../services/queueService');
const logger = require('../logger');
const debugLog = require('../utils/debugLogger');

class QueueController {
    /**
     * Add song to queue
     */
    async addSong(req, res) {
        try {
            const { roomId, song, user } = req.body;

            debugLog.api('Add song request', { roomId, songTitle: song?.title, userId: user?.id });

            if (!roomId || !song) {
                debugLog.warn('Add song missing data', { roomId, hasSong: !!song });
                return res.status(400).json({ error: 'roomId and song are required' });
            }

            const queue = await queueService.addSong(roomId, song, user);

            debugLog.api('Song added successfully', {
                roomId,
                songTitle: song.title,
                queueLength: queue.length
            });

            res.status(200).json({ success: true, queue });
        } catch (error) {
            debugLog.error('Add song failed', { error: error.message, roomId: req.body.roomId });
            console.error('[QueueController] Error adding song:', error);
            logger.error('add_song_error', { error: error.message });
            res.status(500).json({ error: 'Failed to add song' });
        }
    }

    /**
     * Get queue for a room
     */
    async getQueue(req, res) {
        try {
            const { roomId } = req.query;

            debugLog.api('Get queue request', { roomId });

            if (!roomId) {
                debugLog.warn('Get queue missing roomId');
                return res.status(400).json({ error: 'roomId required' });
            }

            const queue = await queueService.getQueue(roomId);

            debugLog.api('Queue fetched', { roomId, queueLength: queue?.length || 0 });

            res.json({ success: true, queue });
        } catch (error) {
            debugLog.error('Get queue failed', { error: error.message, roomId: req.query.roomId });
            console.error('[QueueController] Error getting queue:', error);
            res.status(500).json({ error: 'Failed to get queue' });
        }
    }

    /**
     * Validate room
     */
    async validateRoom(req, res) {
        try {
            const { roomId } = req.query;

            debugLog.api('Validate room request', { roomId });

            if (!roomId) {
                debugLog.warn('Validate room missing roomId');
                return res.status(400).json({ error: 'roomId required' });
            }

            const queue = await queueService.getQueue(roomId);
            const state = await queueService.getState(roomId);
            const viewers = await queueService.getViewers(roomId);

            const response = {
                exists: queue.length > 0 || viewers.length > 0,
                queueCount: queue.length,
                viewerCount: viewers.length,
                playing: state.playing || false,
                currentSong: state.currentSong || null
            };

            debugLog.api('Room validated', {
                roomId,
                exists: response.exists,
                queueCount: response.queueCount,
                viewerCount: response.viewerCount
            });

            res.json(response);
        } catch (error) {
            debugLog.error('Validate room failed', { error: error.message, roomId: req.query.roomId });
            console.error('[QueueController] validateRoom error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new QueueController();
