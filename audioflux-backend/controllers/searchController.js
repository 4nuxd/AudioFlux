const searchService = require('../services/searchService');
const logger = require('../logger');
const debugLog = require('../utils/debugLogger');

class SearchController {
    /**
     * Unified search endpoint - tries JioSaavn first, falls back to YouTube
     */
    async unifiedSearch(req, res) {
        const startTime = Date.now();
        try {
            const { query } = req.query;

            debugLog.api('Unified search request', { query, ip: req.ip });

            if (!query) {
                debugLog.warn('Search request missing query', { ip: req.ip });
                return res.status(400).json({ error: 'query parameter required' });
            }

            console.log('[SearchController] Searching for:', query);
            logger.info('search_endpoint_hit', { query });

            const { results, source } = await searchService.unifiedSearch(query);

            const duration = Date.now() - startTime;
            debugLog.api('Unified search completed', {
                query,
                source,
                resultsCount: results.length,
                duration: `${duration}ms`
            });

            logger.info('search_success', { query, source, resultsCount: results.length });
            res.json({ songs: results, source });
        } catch (error) {
            const duration = Date.now() - startTime;
            debugLog.error('Unified search failed', {
                error: error.message,
                query: req.query.query,
                duration: `${duration}ms`
            });
            console.error('[SearchController] Search API error:', error);
            logger.error('search_api_error', { error: error.message, query: req.query.query });
            res.status(500).json({ error: 'Failed to search songs' });
        }
    }

    /**
     * Combined search endpoint - searches both sources and merges with relevance scoring
     */
    async combinedSearch(req, res) {
        const startTime = Date.now();
        try {
            const { query } = req.query;

            debugLog.api('Combined search request', { query, ip: req.ip });

            if (!query) {
                debugLog.warn('Combined search missing query', { ip: req.ip });
                return res.status(400).json({ error: 'query parameter required' });
            }

            console.log(`[SearchController] Frontend combined search for: "${query}"`);

            const results = await searchService.combinedSearch(query);

            const duration = Date.now() - startTime;
            debugLog.api('Combined search completed', {
                query,
                resultsCount: results.length,
                sources: results.map(r => r.source),
                duration: `${duration}ms`
            });

            console.log(`[SearchController] Returning ${results.length} combined results sorted by relevance`);

            res.json({
                success: true,
                query,
                totalResults: results.length,
                songs: results
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            debugLog.error('Combined search failed', {
                error: error.message,
                query: req.query.query,
                duration: `${duration}ms`
            });
            console.error('[SearchController] Combined search error:', error);
            res.status(500).json({
                success: false,
                error: 'Search failed',
                message: error.message
            });
        }
    }
}

module.exports = new SearchController();
