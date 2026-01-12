const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Get user statistics
router.get('/stats/:userId', userController.getUserStats.bind(userController));

// Liked songs functionality removed - use playlist instead

module.exports = router;
