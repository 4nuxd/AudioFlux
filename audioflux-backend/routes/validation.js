const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validationController');

// Validate user from Telegram WebApp
router.post('/validateUser', validationController.validateUser.bind(validationController));

// Send group notification
router.post('/sendGroupNotification', validationController.sendGroupNotification.bind(validationController));

module.exports = router;
