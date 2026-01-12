const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Unified search endpoint (JioSaavn first, YouTube fallback)
router.get('/songs', searchController.unifiedSearch.bind(searchController));

// Combined search endpoint (both sources with relevance scoring)
router.get('/combined', searchController.combinedSearch.bind(searchController));

module.exports = router;
