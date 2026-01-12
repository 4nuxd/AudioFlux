const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

// Add song to queue
router.post('/addSong', queueController.addSong.bind(queueController));

// Get queue
router.get('/queue', queueController.getQueue.bind(queueController));

// Validate room
router.get('/validateRoom', queueController.validateRoom.bind(queueController));

module.exports = router;
