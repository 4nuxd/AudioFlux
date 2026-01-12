const queueService = require('../services/queueService');
const userService = require('../services/userService');
const telegramService = require('../services/telegramService');
const autoPlayService = require('../services/autoPlayService');
const logger = require('../logger');
const { logSongPlayed } = require('../utils/loggerFunctions');
const debugLog = require('../utils/debugLogger');

class SocketHandler {
    constructor(io) {
        this.io = io;
        this.userRoomMap = new Map(); // userId -> roomId (track which room each user is in)
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log(`[Socket] User connected: ${socket.id}`);
            debugLog.socket('User connected', { socketId: socket.id });
            logger.info('socket_connected', { socketId: socket.id });

            // Join room (frontend uses 'join')
            socket.on('join', async (data) => {
                await this.handleJoinRoom(socket, data);
            });

            // Join room (backward compatibility)
            socket.on('joinRoom', async (data) => {
                await this.handleJoinRoom(socket, data);
            });

            // Leave room
            socket.on('leaveRoom', async (data) => {
                await this.handleLeaveRoom(socket, data);
            });

            // Add song
            socket.on('addSong', async (data) => {
                await this.handleAddSong(socket, data);
            });

            // Play/Pause/Skip controls
            socket.on('play', async (data) => {
                await this.handlePlayback(socket, data, 'play');
            });

            socket.on('pause', async (data) => {
                await this.handlePlayback(socket, data, 'pause');
            });

            socket.on('skip', async (data) => {
                await this.handleSkip(socket, data);
            });

            // Seek
            socket.on('seek', async (data) => {
                await this.handleSeek(socket, data);
            });

            // Loop toggle
            socket.on('toggleLoop', async (data) => {
                await this.handleLoopToggle(socket, data);
            });

            // Toggle auto-play
            socket.on('toggleAutoPlay', async (data) => {
                await this.handleAutoPlayToggle(socket, data);
            });

            // Previous song
            socket.on('previous', async (data) => {
                await this.handlePrevious(socket, data);
            });

            // Remove from queue
            socket.on('removeFromQueue', async (data) => {
                await this.handleRemoveFromQueue(socket, data);
            });

            // State sync
            socket.on('syncState', async (data) => {
                await this.handleSyncState(socket, data);
            });

            // Disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    async handleJoinRoom(socket, data) {
        try {
            const { roomId, user } = data;

            debugLog.socket('Join room request', { roomId, userId: user?.id, socketId: socket.id });

            if (!roomId || !user) {
                debugLog.warn('Join room failed - missing data', { roomId, user });
                socket.emit('error', { message: 'roomId and user are required' });
                return;
            }

            console.log(`User ${user?.id} joining room ${roomId}`);

            // Check if user is already in a different room
            const currentRoom = this.userRoomMap.get(user.id);
            if (currentRoom && currentRoom !== roomId) {
                console.log(`[Socket] User ${user.id} is already in room ${currentRoom}, auto-leaving before joining ${roomId}`);

                // Auto-leave the previous room
                try {
                    await queueService.removeViewer(currentRoom, user.id);
                    const updatedViewers = await queueService.getViewers(currentRoom);
                    this.io.to(currentRoom).emit('viewersUpdated', updatedViewers);

                    // Check occupancy for auto-pause
                    if (global.playbackManager) {
                        await global.playbackManager.checkRoomOccupancy(currentRoom, updatedViewers);
                    }

                    console.log(`[Socket] User ${user.id} auto-left room ${currentRoom}`);
                } catch (e) {
                    console.error(`[Socket] Error auto-leaving room ${currentRoom}:`, e);
                }
            }

            // Track which room this user is now in
            this.userRoomMap.set(user.id, roomId);

            socket.join(roomId);
            socket.roomId = roomId;
            socket.userId = user.id;

            // Store user data on socket for disconnect tracking (old backend compatibility)
            socket.userData = {
                userId: user.id,
                roomId: roomId,
                joinTime: Date.now(),
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                photoUrl: user.photoUrl
            };

            const userProfile = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                photoUrl: user.photoUrl,
                joinedAt: Date.now(),
                socketId: socket.id
            };

            // Remove any existing viewer with same userId (reconnection handling)
            const existingViewers = await queueService.getViewers(roomId) || [];
            for (const viewer of existingViewers) {
                if (viewer.id === user.id) {
                    await queueService.removeViewer(roomId, viewer.id);
                }
            }

            // Check if user was already in room (for notification logic)
            const wasAlreadyInRoom = existingViewers.some(v => v.id === user.id);

            // Add current viewer
            await queueService.addViewer(roomId, user);

            // Get current state and loop mode
            const queue = await queueService.getQueue(roomId) || [];
            const state = await queueService.getState(roomId) || {};
            const viewers = await queueService.getViewers(roomId) || [];
            const loopMode = await queueService.getLoopMode(roomId);
            const autoPlayState = await autoPlayService.getAutoPlayState(roomId);

            // Get room metadata for private rooms
            const { getRoomMetadata } = require('../redis');
            const roomMetadata = await getRoomMetadata(roomId);

            // Calculate real-time playback position
            const stateWithRealTime = {
                ...state,
                currentTime: this.getCurrentPlaybackTime(state)
            };

            debugLog.socket('Room joined successfully', {
                roomId,
                userId: user.id,
                queueLength: queue?.length || 0,
                viewersCount: viewers?.length || 0,
                wasAlreadyInRoom,
                loopMode,
                autoPlayEnabled: autoPlayState.enabled,
                isPrivateRoom: roomMetadata?.isPrivate || false
            });

            // Send current state to the user with server time for sync
            socket.emit('initialState', {
                queue,
                state: stateWithRealTime,
                viewers,
                loopMode,
                autoPlay: autoPlayState,
                serverTime: Date.now(), // For client-side time sync
                roomMetadata: roomMetadata ? {
                    isPrivate: roomMetadata.isPrivate,
                    ownerId: roomMetadata.ownerId,
                    ownerName: roomMetadata.ownerName
                } : null
            });

            // Broadcast updated viewers to ALL clients in room (old backend compatibility)
            this.io.to(roomId).emit('viewersUpdated', viewers);

            // Check room occupancy for auto-pause system
            if (global.playbackManager) {
                await global.playbackManager.checkRoomOccupancy(roomId, viewers);
            }

            // Start playback manager for this room (if not already started)
            if (global.playbackManager) {
                global.playbackManager.startRoom(roomId);
            }

            // Send initial history state to client
            await this.emitHistoryUpdate(roomId);

            // Only send Telegram notification if user wasn't already in room
            if (!wasAlreadyInRoom) {
                await telegramService.sendJoinLeaveNotification(roomId, user, 'join');
            }

            logger.info('user_joined_room', { roomId, userId: user.id, socketId: socket.id, wasAlreadyInRoom });
        } catch (error) {
            debugLog.error('Error in handleJoinRoom', error);
            console.error('[Socket] Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    }

    /**
     * Calculate current playback time based on state
     */
    getCurrentPlaybackTime(state) {
        if (!state.playing || !state.songStartedAt) {
            return state.currentTime || 0;
        }

        // Calculate how much time has passed since song started
        const elapsed = Date.now() - state.songStartedAt;
        let currentPosition = (state.currentTime || 0) + (elapsed / 1000);

        // Don't exceed song duration
        if (state.currentSong && state.currentSong.duration) {
            currentPosition = Math.min(currentPosition, state.currentSong.duration);
        }

        return currentPosition;
    }

    /**
     * Emit history update to all clients in room
     */
    async emitHistoryUpdate(roomId) {
        try {
            const history = await queueService.getSongHistory(roomId);
            const hasHistory = history && history.length > 0;
            this.io.to(roomId).emit('historyUpdated', { hasHistory });
            console.log(`[Socket] History updated for room ${roomId}: hasHistory=${hasHistory}`);
        } catch (error) {
            console.error('[Socket] Error emitting history update:', error);
        }
    }

    async handleLeaveRoom(socket, data) {
        try {
            const { roomId, user, sessionMinutes } = data;

            if (!roomId || !user) {
                return;
            }

            // Remove viewer from room
            await queueService.removeViewer(roomId, user.id);

            const viewers = await queueService.getViewers(roomId);

            // Broadcast updated viewers to ALL clients (old backend compatibility)
            this.io.to(roomId).emit('viewersUpdated', viewers);

            // Check room occupancy for auto-pause system
            if (global.playbackManager) {
                await global.playbackManager.checkRoomOccupancy(roomId, viewers);
            }

            // Send notification to Telegram group
            await telegramService.sendJoinLeaveNotification(roomId, user, 'leave');

            // Track listening session
            if (sessionMinutes) {
                await userService.addListeningSession(user.id, sessionMinutes);
            }

            socket.leave(roomId);

            // Remove user from room tracking map
            if (this.userRoomMap.get(user.id) === roomId) {
                this.userRoomMap.delete(user.id);
            }

            logger.info('user_left_room', { roomId, userId: user.id, sessionMinutes });
        } catch (error) {
            console.error('[Socket] Error leaving room:', error);
        }
    }

    async handleAddSong(socket, data) {
        try {
            const { roomId, song, user } = data;

            if (!roomId || !song || !user) {
                socket.emit('error', { message: 'roomId, song, and user are required' });
                return;
            }

            // Get current queue to check if this is the first song
            const currentQueue = await queueService.getQueue(roomId);
            const state = await queueService.getState(roomId);
            const isFirstSong = (!currentQueue || currentQueue.length === 0) && !state.currentSong;

            // Add song to queue
            const queue = await queueService.addSong(roomId, song, user);

            // Broadcast updated queue to all clients in the room
            this.io.to(roomId).emit('queueUpdated', queue);

            // Send notification to Telegram group
            await telegramService.sendActionNotification(roomId, 'addSong', user, song);

            // Track user stats
            await userService.incrementSongsAdded(user.id);

            // If this is the first song, log it as "now playing"
            if (isFirstSong) {
                try {
                    const chat = await telegramService.getBot().telegram.getChat(roomId);
                    await logSongPlayed(roomId, chat.title, song, user);
                } catch (logError) {
                    console.error('[Socket] Error logging song played:', logError);
                }
            }

            logger.info('song_added_via_socket', { roomId, songId: song.id, userId: user.id, isFirstSong });
        } catch (error) {
            console.error('[Socket] Error adding song:', error);
            socket.emit('error', { message: 'Failed to add song' });
        }
    }

    async handlePlayback(socket, data, action) {
        try {
            const { roomId, user } = data;

            if (!roomId) {
                socket.emit('error', { message: 'roomId is required' });
                return;
            }

            // Get current state to check if song exists
            const state = await queueService.getState(roomId);

            // Delegate to PlaybackManager
            if (global.playbackManager) {
                await global.playbackManager.handlePlayPause(roomId, action === 'play');
            } else {
                // Fallback to old behavior
                state.playing = action === 'play';
                if (action === 'play') {
                    state.songStartedAt = Date.now() - ((state.currentTime || 0) * 1000);
                }
                await queueService.setState(roomId, state);
                this.io.to(roomId).emit('stateUpdate', state);
            }

            // Send notification ONLY if a song is currently loaded
            if (user && state.currentSong) {
                await telegramService.sendActionNotification(roomId, action, user);
            }

            logger.info(`playback_${action}`, { roomId, userId: user?.id });
        } catch (error) {
            console.error(`[Socket] Error ${action}:`, error);
            socket.emit('error', { message: `Failed to ${action}` });
        }
    }

    async handleSkip(socket, data) {
        try {
            const { roomId, user } = data;

            if (!roomId) {
                socket.emit('error', { message: 'roomId is required' });
                return;
            }

            // Delegate to PlaybackManager (which will send notification)
            if (global.playbackManager) {
                await global.playbackManager.handleSkip(roomId, user);
            } else {
                // Fallback to old behavior
                const queue = await queueService.getQueue(roomId);
                const hasSongsToSkip = queue.length > 0;

                if (hasSongsToSkip) {
                    queue.shift();
                    await queueService.setQueue(roomId, queue);
                    const state = await queueService.getState(roomId);
                    state.currentSong = queue[0] || null;
                    state.currentTime = 0;
                    state.songStartedAt = Date.now();
                    await queueService.setState(roomId, state);
                    this.io.to(roomId).emit('queueUpdated', queue);
                    this.io.to(roomId).emit('stateUpdate', state);

                    // Send notification for fallback
                    if (user) {
                        await telegramService.sendActionNotification(roomId, 'skip', user);
                    }
                }
            }

            logger.info('song_skipped', { roomId, userId: user?.id });
        } catch (error) {
            console.error('[Socket] Error skipping:', error);
            socket.emit('error', { message: 'Failed to skip' });
        }
    }

    async handleSeek(socket, data) {
        try {
            const { roomId, time } = data;

            if (!roomId || time === undefined) {
                socket.emit('error', { message: 'roomId and time are required' });
                return;
            }

            // Delegate to PlaybackManager
            if (global.playbackManager) {
                await global.playbackManager.handleSeek(roomId, time);
            } else {
                // Fallback to old behavior
                const state = await queueService.getState(roomId);
                state.currentTime = time;
                state.songStartedAt = Date.now() - (time * 1000);
                await queueService.setState(roomId, state);
                this.io.to(roomId).emit('seeked', { time });
            }

            logger.info('playback_seeked', { roomId, time });
        } catch (error) {
            console.error('[Socket] Error seeking:', error);
            socket.emit('error', { message: 'Failed to seek' });
        }
    }

    async handleLoopToggle(socket, data) {
        try {
            const { roomId, user } = data;

            if (!roomId) {
                socket.emit('error', { message: 'roomId is required' });
                return;
            }

            // Get current state and loop mode
            const state = await queueService.getState(roomId);
            const currentMode = await queueService.getLoopMode(roomId);

            // Cycle through modes: none -> one -> all -> none
            let newMode;
            if (currentMode === 'none') {
                newMode = 'one';
            } else if (currentMode === 'one') {
                newMode = 'all';
            } else {
                newMode = 'none';
            }

            // Save new mode
            await queueService.setLoopMode(roomId, newMode);

            // Broadcast loop mode change to all clients
            this.io.to(roomId).emit('loopModeChanged', { loopMode: newMode });

            // Send notification ONLY if:
            // 1. Song is currently playing
            // 2. Loop is being ENABLED (not disabled)
            if (user && state.currentSong && state.playing && newMode !== 'none') {
                const modeText = newMode === 'one' ? 'current song' : 'all songs';
                await telegramService.sendActionNotification(roomId, 'loop', user, { mode: modeText });
            }

            logger.info('loop_mode_changed', { roomId, userId: user?.id, oldMode: currentMode, newMode });
        } catch (error) {
            console.error('[Socket] Error toggling loop:', error);
            socket.emit('error', { message: 'Failed to toggle loop' });
        }
    }

    async handleAutoPlayToggle(socket, data) {
        try {
            const { roomId, user } = data;

            if (!roomId) {
                socket.emit('error', { message: 'roomId is required' });
                return;
            }

            // Toggle auto-play state
            const newState = await autoPlayService.toggleAutoPlay(roomId);

            // If auto-play is being turned OFF, remove all auto-play songs from queue
            if (!newState.enabled) {
                const queue = await queueService.getQueue(roomId);
                const originalLength = queue.length;

                // Filter out all auto-play songs
                const filteredQueue = queue.filter(song => !song.isAutoPlay);
                const removedCount = originalLength - filteredQueue.length;

                if (removedCount > 0) {
                    await queueService.setQueue(roomId, filteredQueue);

                    // Broadcast updated queue
                    this.io.to(roomId).emit('queueUpdated', filteredQueue);

                    console.log(`[Socket] Removed ${removedCount} auto-play songs from queue in room ${roomId}`);

                    // Send notification about removed songs
                    if (user) {
                        await telegramService.sendActionNotification(roomId, 'autoPlayOff', user, { removedCount });
                    }
                }
            }

            // Broadcast auto-play state change to all clients
            this.io.to(roomId).emit('autoPlayChanged', {
                enabled: newState.enabled,
                lastSongId: newState.lastSongId
            });

            console.log(`[Socket] Auto-play ${newState.enabled ? 'enabled' : 'disabled'} for room ${roomId}`);
            logger.info('autoplay_toggled', {
                roomId,
                userId: user?.id,
                enabled: newState.enabled
            });
        } catch (error) {
            console.error('[Socket] Error toggling auto-play:', error);
            socket.emit('error', { message: 'Failed to toggle auto-play' });
        }
    }

    async handlePrevious(socket, data) {
        try {
            const { roomId, user } = data;

            if (!roomId) {
                socket.emit('error', { message: 'roomId is required' });
                return;
            }

            // Get current state first
            const state = await queueService.getState(roomId);
            const currentSong = state.currentSong;

            // Try to get previous song from history
            const previousSong = await queueService.previousSong(roomId);

            if (!previousSong) {
                // No previous song available - do nothing
                console.log('[Socket] No previous song in history - ignoring previous request');
                return;
            }

            console.log('[Socket] Going to previous song:', previousSong.title);

            // The previousSong() method already adds the previous song to the front of the queue
            // Now we need to add the current song right after it (so it doesn't get lost)
            if (currentSong) {
                const queue = await queueService.getQueue(roomId);
                // Insert current song at position 1 (after the previous song which is at position 0)
                queue.splice(1, 0, currentSong);
                await queueService.setQueue(roomId, queue);
                console.log('[Socket] Added current song to queue at position 1');
            }

            // Now skip to the previous song (which is first in queue)
            if (global.playbackManager) {
                await global.playbackManager.handleSkip(roomId, user);
            } else {
                // Fallback: manually update state
                const queue = await queueService.getQueue(roomId);
                const nextSong = queue.shift();
                await queueService.setQueue(roomId, queue);

                state.currentSong = nextSong || null;
                state.currentTime = 0;
                state.songStartedAt = Date.now();
                await queueService.setState(roomId, state);

                this.io.to(roomId).emit('queueUpdated', queue);
                this.io.to(roomId).emit('stateUpdate', state);
            }

            // Send notification
            if (user) {
                await telegramService.sendActionNotification(roomId, 'previous', user, { songTitle: previousSong.title });
            }

            // Emit history update (history state changed after using previous)
            await this.emitHistoryUpdate(roomId);

            logger.info('previous_song_played', { roomId, userId: user?.id, songId: previousSong.id });
        } catch (error) {
            console.error('[Socket] Error going to previous song:', error);
            socket.emit('error', { message: 'Failed to go to previous song' });
        }
    }

    async handleRemoveFromQueue(socket, data) {
        try {
            const { roomId, songIndex, song, user } = data;

            if (!roomId || songIndex === undefined) {
                socket.emit('error', { message: 'roomId and songIndex are required' });
                return;
            }

            const queue = await queueService.getQueue(roomId);

            if (songIndex < 0 || songIndex >= queue.length) {
                socket.emit('error', { message: 'Invalid song index' });
                return;
            }

            // Get the song before removing
            const removedSong = queue[songIndex];

            // Remove from queue
            queue.splice(songIndex, 1);
            await queueService.setQueue(roomId, queue);

            // Broadcast updated queue
            this.io.to(roomId).emit('queueUpdated', queue);

            // Send Telegram notification with song details
            if (user && removedSong) {
                await telegramService.sendActionNotification(roomId, 'removeFromQueue', user, removedSong);
            }

            logger.info('song_removed_from_queue', { roomId, songIndex, songId: removedSong?.id, userId: user?.id });
        } catch (error) {
            console.error('[Socket] Error removing from queue:', error);
            socket.emit('error', { message: 'Failed to remove from queue' });
        }
    }

    async handleSyncState(socket, data) {
        try {
            const { roomId, state } = data;

            if (!roomId || !state) {
                socket.emit('error', { message: 'roomId and state are required' });
                return;
            }

            await queueService.setState(roomId, state);

            // Broadcast state to all other clients
            socket.to(roomId).emit('stateUpdate', state);

            logger.info('state_synced', { roomId });
        } catch (error) {
            console.error('[Socket] Error syncing state:', error);
            socket.emit('error', { message: 'Failed to sync state' });
        }
    }

    async handleDisconnect(socket) {
        console.log(`[Socket] User disconnected: ${socket.id}`);
        logger.info('socket_disconnected', { socketId: socket.id });

        // Clean up if needed
        if (socket.roomId && socket.userId) {
            try {
                const roomId = socket.roomId;
                const userId = socket.userId;

                console.log(`[Socket] Disconnect cleanup for user ${userId} in room ${roomId}`);

                // Get user info before removing (try Redis first, then socket.userData)
                const viewers = await queueService.getViewers(roomId);
                let user = viewers.find(v => v.id === userId);

                // Fallback to socket.userData if not found in Redis
                if (!user && socket.userData) {
                    user = {
                        id: userId,
                        firstName: socket.userData.firstName || 'User',
                        username: socket.userData.username,
                        photoUrl: socket.userData.photoUrl
                    };
                }

                console.log(`[Socket] User info:`, user);

                // Check if user has any other active connections BEFORE removing
                const socketsInRoom = await this.io.in(roomId).fetchSockets();
                const otherConnections = socketsInRoom.filter(s => s.userId === userId && s.id !== socket.id);
                const userStillConnected = otherConnections.length > 0;

                console.log(`[Socket] Other connections for user ${userId}:`, otherConnections.length);
                console.log(`[Socket] User still connected:`, userStillConnected);

                // Remove viewer from Redis
                await queueService.removeViewer(roomId, userId);

                // Get updated viewers list and broadcast
                const updatedViewers = await queueService.getViewers(roomId);
                this.io.to(roomId).emit('viewersUpdated', updatedViewers);

                // Send leave notification if user has no other connections
                if (!userStillConnected && user) {
                    console.log(`[Socket] Sending leave notification for user ${userId}`);
                    await telegramService.sendJoinLeaveNotification(roomId, user, 'leave');
                } else {
                    console.log(`[Socket] NOT sending leave notification - userStillConnected: ${userStillConnected}, hasUser: ${!!user}`);
                }
            } catch (err) {
                console.error('[Socket] Error removing viewer on disconnect:', err);
            }
        } else {
            console.log(`[Socket] No cleanup needed - roomId: ${socket.roomId}, userId: ${socket.userId}`);
        }
    }
}

module.exports = SocketHandler;
