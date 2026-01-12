const { searchSongs: searchSaavn } = require('../utils/saavn');
const spotifyServiceOld = require('../utils/spotify');
const youtubeService = require('./youtubeService');
const spotifyService = require('./spotifyService');
const logger = require('../logger');

class SearchService {
    constructor() {
        this.searchResultsCache = new Map();
        this.recentSearches = new Map();
    }

    /**
     * Unified search - JioSaavn only (YouTube/Spotify disabled)
     */
    async unifiedSearch(query) {
        try {
            // Check if it's a direct URL
            if (this.isUrl(query)) {
                return await this.handleDirectUrl(query);
            }

            // JioSaavn search only
            const saavnResults = await searchSaavn(query);

            if (saavnResults && saavnResults.length > 0) {
                return { results: saavnResults, source: 'saavn' };
            }

            // No results
            return { results: [], source: 'none' };
        } catch (error) {
            logger.error('unified_search_error', { query, error: error.message });
            throw error;
        }
    }

    /**
     * Combined search - JioSaavn only (YouTube/Spotify disabled)
     */
    async combinedSearch(query) {
        try {
            // Check if it's a direct URL
            if (this.isUrl(query)) {
                const urlResult = await this.handleDirectUrl(query);
                return urlResult.results;
            }

            // Saavn search only
            const saavnResults = await searchSaavn(query).catch(err => {
                return [];
            });

            logger.info('combined_search_success', {
                query,
                saavnCount: saavnResults.length,
                youtubeCount: 0,
                spotifyCount: 0,
                totalCount: saavnResults.length
            });

            return saavnResults;

        } catch (error) {
            logger.error('combined_search_error', { error: error.message, query });
            return [];
        }
    }

    /**
     * Score search results based on relevance
     */
    _scoreResults(results, query) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

        return results.map(song => {
            const titleLower = (song.title || '').toLowerCase();
            const artistsLower = Array.isArray(song.artists)
                ? song.artists.join(' ').toLowerCase()
                : '';

            let score = 0;

            // Exact title match gets highest score
            if (titleLower === queryLower) {
                score += 100;
            }

            // Title contains full query
            if (titleLower.includes(queryLower)) {
                score += 50;
            }

            // Title starts with query
            if (titleLower.startsWith(queryLower)) {
                score += 30;
            }

            // Count matching words in title
            queryWords.forEach(word => {
                if (titleLower.includes(word)) {
                    score += 10;
                }
            });

            // Artist name matches
            if (artistsLower.includes(queryLower)) {
                score += 20;
            }

            queryWords.forEach(word => {
                if (artistsLower.includes(word)) {
                    score += 5;
                }
            });

            // Prefer songs with download URLs
            if (song.downloadUrl) {
                score += 15;
            }

            // Slight preference for JioSaavn (usually better quality metadata)
            if (song.source === 'saavn') {
                score += 5;
            }

            return {
                ...song,
                relevanceScore: score
            };
        });
    }

    /**
     * Check if input is a URL
     */
    isUrl(input) {
        return /^https?:\/\//.test(input) || input.includes('youtube.com') || input.includes('youtu.be') || input.includes('spotify.com');
    }

    /**
     * Handle direct URL (YouTube or Spotify)
     */
    async handleDirectUrl(url) {
        try {
            // Check if it's a Spotify URL
            if (spotifyService.isSpotifyUrl(url)) {
                console.log('[SearchService] Detected Spotify URL, converting to YouTube...');
                const result = await spotifyService.convertToYouTube(url);
                return { results: [result], source: 'spotify' };
            }

            // Check if it's a YouTube URL
            if (youtubeService.extractVideoId(url)) {
                console.log('[SearchService] Detected YouTube URL, downloading...');
                const result = await youtubeService.downloadVideo(url);
                const videoInfo = await youtubeService.getVideoInfo(url);

                return {
                    results: [{
                        ...result,
                        ...videoInfo,
                        source: 'youtube'
                    }],
                    source: 'youtube'
                };
            }

            throw new Error('Unsupported URL format');
        } catch (error) {
            console.error('[SearchService] Error handling direct URL:', error.message);
            throw error;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.searchResultsCache.clear();
        this.recentSearches.clear();
    }
}

module.exports = new SearchService();
