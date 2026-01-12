const queueService = require('../services/queueService');
const telegramService = require('../services/telegramService');
const autoPlayService = require('../services/autoPlayService');
const { logSongPlayed } = require('../utils/loggerFunctions');
const logger = require('../logger');

class PlaybackManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> playback state
        this.intervals = new Map(); // roomId -> interval
        this.refilling = new Map(); // roomId -> boolean (prevent concurrent refills)
        this.emptyRoomTimers = new Map(); // roomId -> { emptySince: timestamp, timer: timeout }
        this.EMPTY_ROOM_PAUSE_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds

        // CACHE: Reduce Redis reads by caching frequently accessed data
        this.cache = new Map(); // roomId -> { state, queue, loopMode, autoPlayState, lastUpdate }
        this.CACHE_TTL = 10000; // 10 seconds - refresh cache if older than this
    }

    /**
     * Get cached data or fetch from Redis if stale
     */
    async getCachedRoomData(roomId, forceRefresh = false) {
        const now = Date.now();
        const cached = this.cache.get(roomId);

        // Return cache if fresh (less than 10 seconds old) and not forcing refresh
        if (!forceRefresh && cached && (now - cached.lastUpdate) < this.CACHE_TTL) {
            return cached;
        }

        // Fetch fresh data from Redis
        const [state, queue, loopMode, autoPlayState] = await Promise.all([
            queueService.getState(roomId),
            queueService.getQueue(roomId),
            queueService.getLoopMode(roomId),
            autoPlayService.getAutoPlayState(roomId)
        ]);

        const roomData = {
            state: state || {},
            queue: queue || [],
            loopMode: loopMode || 'none',
            autoPlayState: autoPlayState || { enabled: false },
            lastUpdate: now
        };

        this.cache.set(roomId, roomData);
        return roomData;
    }

    /**
     * Invalidate cache for a room (call this when data is updated)
     */
    invalidateCache(roomId) {
        this.cache.delete(roomId);
    }

    /**
     * Update cache after modifying data
     */
    async updateCache(roomId, updates) {
        const cached = this.cache.get(roomId);
        if (cached) {
            Object.assign(cached, updates);
            cached.lastUpdate = Date.now();
        }
    }

    /**
     * Start managing playback for a room
     */
    async startRoom(roomId) {
        if (this.intervals.has(roomId)) {
            console.log(`[PlaybackManager] Room ${roomId} already being managed`);
            return;
        }

        console.log(`[PlaybackManager] Starting playback management for room ${roomId}`);

        // Initialize room state
        const state = await queueService.getState(roomId);
        const queue = await queueService.getQueue(roomId);

        // Start playback loop - check every second
        const interval = setInterval(async () => {
            await this.tick(roomId);
        }, 1000);

        this.intervals.set(roomId, interval);
    }

    /**
     * Stop managing playback for a room
     */
    stopRoom(roomId) {
        const interval = this.intervals.get(roomId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(roomId);
            this.rooms.delete(roomId);
            console.log(`[PlaybackManager] Stopped playback management for room ${roomId}`);
        }
    }

    /**
     * Main playback tick - runs every second
     */
    async tick(roomId) {
        try {
            // Use cached data to reduce Redis reads
            const roomData = await this.getCachedRoomData(roomId);
            const { state, queue, loopMode, autoPlayState } = roomData;

            // If nothing is playing and queue has songs, start playing
            if (!state.currentSong && queue.length > 0) {
                await this.playNextSong(roomId);
                return;
            }

            // If not playing, don't advance time
            if (!state.playing || !state.currentSong) {
                return;
            }

            // Auto-play: If queue is getting low (2 or fewer songs) and auto-play is enabled, add more songs
            if (queue.length <= 2 && state.currentSong) {
                // Prevent concurrent refills
                if (autoPlayState.enabled && !this.refilling.get(roomId)) {
                    this.refilling.set(roomId, true);

                    try {
                        // Use the CURRENTLY PLAYING song for suggestions to get variety
                        // This ensures we get different suggestions each time
                        const baseSongId = state.currentSong.id;

                        console.log(`[PlaybackManager] Queue low (${queue.length} songs), fetching auto-play based on currently playing: "${state.currentSong.title}"`);

                        const suggestions = await autoPlayService.fetchSuggestions(baseSongId, 10);

                        if (suggestions && suggestions.length > 0) {
                            // Add 3 more songs to keep queue populated
                            const songsToAdd = suggestions.slice(0, Math.min(3, suggestions.length));

                            for (const song of songsToAdd) {
                                await queueService.addSong(roomId, song);
                            }

                            const updatedQueue = await queueService.getQueue(roomId);
                            console.log(`[PlaybackManager] Added ${songsToAdd.length} auto-play songs, queue now has ${updatedQueue.length} songs`);

                            // Invalidate cache since queue changed
                            this.invalidateCache(roomId);

                            // Broadcast updated queue
                            this.io.to(roomId).emit('queueUpdated', updatedQueue);

                            // Update the last played song ID so next refill uses a different base
                            await autoPlayService.updateLastPlayedSong(roomId, baseSongId);

                            logger.info('autoplay_queue_refilled', {
                                roomId,
                                basedOn: state.currentSong.title,
                                addedCount: songsToAdd.length,
                                newQueueLength: updatedQueue.length
                            });
                        }
                    } finally {
                        // Always clear the refilling flag
                        this.refilling.set(roomId, false);
                    }
                }
            }

            // Calculate current playback time
            const elapsed = (Date.now() - state.songStartedAt) / 1000;
            const currentTime = (state.currentTime || 0) + elapsed;

            // Check if song has ended
            if (currentTime >= state.currentSong.duration) {
                console.log(`[PlaybackManager] Song ended in room ${roomId}, advancing...`);
                await this.handleSongEnd(roomId, loopMode);
            } else {
                // Broadcast progress update every second
                this.io.to(roomId).emit('progressUpdate', {
                    currentTime: currentTime,
                    serverTime: Date.now()
                });
            }
        } catch (error) {
            console.error(`[PlaybackManager] Error in tick for room ${roomId}:`, error);
        }
    }

    /**
     * Handle song ending
     */
    async handleSongEnd(roomId, loopMode) {
        const queue = await queueService.getQueue(roomId);
        const state = await queueService.getState(roomId);
        const currentSong = state.currentSong;

        console.log(`[PlaybackManager] handleSongEnd called for room ${roomId}`);
        console.log(`[PlaybackManager] Current song: "${currentSong?.title}", Queue length: ${queue.length}, Loop mode: ${loopMode}`);

        if (loopMode === 'one') {
            // Loop current song - restart it
            console.log(`[PlaybackManager] Looping current song in room ${roomId}`);
            state.currentTime = 0;
            state.songStartedAt = Date.now();
            await queueService.setState(roomId, state);
            this.invalidateCache(roomId);

            // Broadcast restart
            this.io.to(roomId).emit('stateUpdate', state);
            this.io.to(roomId).emit('songRestarted', { song: state.currentSong });
        } else if (queue.length > 0) {
            console.log(`[PlaybackManager] Queue has ${queue.length} songs, moving to next`);

            // Add current song to history before moving to next
            if (currentSong) {
                await queueService.addToHistory(roomId, currentSong);

                // Emit history update (history now has songs, enable previous button)
                const history = await queueService.getSongHistory(roomId);
                const hasHistory = history && history.length > 0;
                this.io.to(roomId).emit('historyUpdated', { hasHistory });
            }

            // If loop 'all' is enabled, add the current song to the end of queue
            if (loopMode === 'all' && currentSong) {
                queue.push(currentSong);
                await queueService.setQueue(roomId, queue);
                this.invalidateCache(roomId);
                console.log(`[PlaybackManager] Loop all: Re-added "${currentSong.title}" to end of queue`);
            }

            // Play next song (playNextSong will handle removing it from queue)
            await this.playNextSong(roomId);
        } else {
            console.log(`[PlaybackManager] Queue empty, checking for auto-play`);

            // No more songs in queue - check for auto-play
            const autoPlayEnabled = await autoPlayService.getAutoPlayState(roomId);

            if (autoPlayEnabled.enabled) {
                // Auto-play is enabled - fetch multiple suggestions
                console.log(`[PlaybackManager] Auto-play enabled, fetching suggestions`);

                const suggestions = await autoPlayService.fetchSuggestions(currentSong?.id || autoPlayEnabled.lastSongId, 10);

                if (suggestions && suggestions.length > 0) {
                    // Add first 3 auto-play songs to queue (or all if less than 3)
                    const songsToAdd = suggestions.slice(0, Math.min(3, suggestions.length));

                    console.log(`[PlaybackManager] Adding ${songsToAdd.length} auto-play songs to queue`);

                    for (const song of songsToAdd) {
                        await queueService.addSong(roomId, song);
                    }

                    const updatedQueue = await queueService.getQueue(roomId);
                    console.log(`[PlaybackManager] Queue now has ${updatedQueue.length} songs`);

                    // Invalidate cache since queue changed
                    this.invalidateCache(roomId);

                    // Broadcast updated queue
                    this.io.to(roomId).emit('queueUpdated', updatedQueue);

                    // Update last played song ID for future suggestions
                    if (currentSong?.id) {
                        await autoPlayService.updateLastPlayedSong(roomId, currentSong.id);
                    }

                    // Add current song to history
                    if (currentSong) {
                        await queueService.addToHistory(roomId, currentSong);
                        const history = await queueService.getSongHistory(roomId);
                        const hasHistory = history && history.length > 0;
                        this.io.to(roomId).emit('historyUpdated', { hasHistory });
                    }

                    // Play the first auto-play song (others stay in queue)
                    await this.playNextSong(roomId);

                    logger.info('autoplay_songs_added', { roomId, count: songsToAdd.length });
                } else {
                    console.log(`[PlaybackManager] No auto-play suggestions available`);
                    state.currentSong = null;
                    state.playing = false;
                    state.currentTime = 0;
                    await queueService.setState(roomId, state);
                    this.invalidateCache(roomId);
                    this.io.to(roomId).emit('stateUpdate', state);
                }
            } else {
                // No auto-play or no suggestions available
                console.log(`[PlaybackManager] Queue finished, no auto-play available`);
                state.currentSong = null;
                state.playing = false;
                state.currentTime = 0;
                await queueService.setState(roomId, state);
                this.invalidateCache(roomId);

                this.io.to(roomId).emit('stateUpdate', state);
            }
        }
    }

    /**
     * Play next song in queue
     */
    async playNextSong(roomId) {
        const queue = await queueService.getQueue(roomId);

        console.log(`[PlaybackManager] playNextSong called for room ${roomId}, queue length: ${queue.length}`);

        if (queue.length === 0) {
            console.log(`[PlaybackManager] No songs in queue for room ${roomId}`);
            return;
        }

        // Log queue state before removal
        console.log(`[PlaybackManager] Queue before shift:`, queue.map(s => s.title));

        // Remove the song from queue and set it as current
        const nextSong = queue.shift();
        await queueService.setQueue(roomId, queue);

        console.log(`[PlaybackManager] Removed "${nextSong.title}" from queue, remaining: ${queue.length} songs`);
        console.log(`[PlaybackManager] Queue after shift:`, queue.map(s => s.title));

        const state = await queueService.getState(roomId);
        state.currentSong = nextSong;
        state.playing = true;
        state.currentTime = 0;
        state.songStartedAt = Date.now();

        await queueService.setState(roomId, state);
        this.invalidateCache(roomId);

        // Broadcast updates
        this.io.to(roomId).emit('stateUpdate', state);
        this.io.to(roomId).emit('queueUpdated', queue);

        // Send now playing notification
        await telegramService.sendNowPlayingNotification(roomId, nextSong);

        // Log song played
        try {
            const chat = await telegramService.getBot().telegram.getChat(roomId);
            await logSongPlayed(roomId, chat.title, nextSong, nextSong.addedBy);
        } catch (error) {
            console.error('[PlaybackManager] Error logging song:', error);
        }

        console.log(`[PlaybackManager] Now playing in room ${roomId}: "${nextSong.title}"`);
    }

    /**
     * Handle manual play/pause from user
     */
    async handlePlayPause(roomId, playing) {
        const state = await queueService.getState(roomId);

        state.playing = playing;

        if (playing) {
            // Resuming - adjust songStartedAt
            state.songStartedAt = Date.now() - ((state.currentTime || 0) * 1000);
        } else {
            // Pausing - update currentTime
            const elapsed = (Date.now() - state.songStartedAt) / 1000;
            state.currentTime = (state.currentTime || 0) + elapsed;
        }

        this.invalidateCache(roomId);

        await queueService.setState(roomId, state);
        this.io.to(roomId).emit('stateUpdate', state);
    }

    /**
     * Handle manual skip from user
     */
    async handleSkip(roomId, user = null) {
        const queue = await queueService.getQueue(roomId);
        const loopMode = await queueService.getLoopMode(roomId);
        const hasSongsToSkip = queue.length > 0;

        // CRITICAL FIX: If loop mode is 'one', disable it before skipping
        if (loopMode === 'one') {
            console.log(`[PlaybackManager] Disabling loop mode 'one' before skip in room ${roomId}`);
            await queueService.setLoopMode(roomId, 'none');
            await this.handleSongEnd(roomId, 'none'); // Skip with loop disabled
            // Re-enable loop mode after skip
            await queueService.setLoopMode(roomId, 'one');
            this.io.to(roomId).emit('loopModeChanged', { loopMode: 'one' });
        } else {
            await this.handleSongEnd(roomId, loopMode);
        }

        // Send skip notification if user provided and there were songs to skip
        if (user && hasSongsToSkip) {
            await telegramService.sendActionNotification(roomId, 'skip', user);
        }
    }

    /**
     * Handle manual seek from user
     */
    async handleSeek(roomId, time) {
        const state = await queueService.getState(roomId);
        state.currentTime = time;
        state.songStartedAt = Date.now() - (time * 1000);
        await queueService.setState(roomId, state);
        this.invalidateCache(roomId);
        this.io.to(roomId).emit('stateUpdate', state);
    }

    /**
     * Check if room is empty and handle auto-pause
     */
    async checkRoomOccupancy(roomId, viewers) {
        const viewerCount = viewers ? viewers.length : 0;

        if (viewerCount === 0) {
            // Room is empty - start timer if not already started
            if (!this.emptyRoomTimers.has(roomId)) {
                console.log(`[PlaybackManager] Room ${roomId} is now empty, starting 5-minute auto-pause timer`);

                const timer = setTimeout(async () => {
                    await this.autoPauseEmptyRoom(roomId);
                }, this.EMPTY_ROOM_PAUSE_DELAY);

                this.emptyRoomTimers.set(roomId, {
                    emptySince: Date.now(),
                    timer: timer
                });
            }
        } else {
            // Room has viewers - cancel auto-pause timer if exists
            this.cancelEmptyRoomTimer(roomId);
        }
    }

    /**
     * Auto-pause empty room after delay
     */
    async autoPauseEmptyRoom(roomId) {
        try {
            console.log(`[PlaybackManager] Auto-pausing empty room ${roomId} after 5 minutes of inactivity`);

            const state = await queueService.getState(roomId);
            const queue = await queueService.getQueue(roomId);

            // Pause playback
            if (state.playing) {
                state.playing = false;
                const elapsed = (Date.now() - state.songStartedAt) / 1000;
                state.currentTime = (state.currentTime || 0) + elapsed;
                await queueService.setState(roomId, state);
                this.io.to(roomId).emit('stateUpdate', state);
                console.log(`[PlaybackManager] Paused playback in empty room ${roomId}`);
            }

            // Clear auto-play songs from queue (keep user-added songs)
            const autoPlayState = await autoPlayService.getAutoPlayState(roomId);
            if (autoPlayState.enabled && queue.length > 0) {
                // Filter out auto-play songs (songs without addedBy or with system addedBy)
                const userSongs = queue.filter(song =>
                    song.addedBy &&
                    song.addedBy.id &&
                    song.addedBy.id !== 'autoplay' &&
                    song.addedBy.id !== 'system'
                );

                const removedCount = queue.length - userSongs.length;

                if (removedCount > 0) {
                    await queueService.setQueue(roomId, userSongs);
                    this.io.to(roomId).emit('queueUpdated', userSongs);
                    console.log(`[PlaybackManager] Removed ${removedCount} auto-play songs from empty room ${roomId}`);
                }
            }

            // Stop playback manager for this room to save resources
            this.stopRoom(roomId);

            // Clean up timer
            this.emptyRoomTimers.delete(roomId);

            logger.info('empty_room_auto_paused', {
                roomId,
                hadSong: !!state.currentSong,
                queueCleared: queue.length
            });
        } catch (error) {
            console.error(`[PlaybackManager] Error auto-pausing empty room ${roomId}:`, error);
        }
    }

    /**
     * Cancel empty room timer (when someone joins)
     */
    cancelEmptyRoomTimer(roomId) {
        const timerData = this.emptyRoomTimers.get(roomId);
        if (timerData) {
            clearTimeout(timerData.timer);
            this.emptyRoomTimers.delete(roomId);

            const emptyDuration = Math.floor((Date.now() - timerData.emptySince) / 1000);
            console.log(`[PlaybackManager] Cancelled auto-pause timer for room ${roomId} (was empty for ${emptyDuration}s)`);
        }
    }

    /**
     * Stop managing playback and clean up timers
     */
    stopRoom(roomId) {
        const interval = this.intervals.get(roomId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(roomId);
            this.rooms.delete(roomId);
            console.log(`[PlaybackManager] Stopped playback management for room ${roomId}`);
        }

        // Also cancel any empty room timer
        this.cancelEmptyRoomTimer(roomId);

        // Clear cache for this room
        this.cache.delete(roomId);
    }
}

module.exports = PlaybackManager;
