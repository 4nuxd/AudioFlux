# Redis Optimization - Cache Implementation

## Problem
The bot was consuming **2300+ Redis read commands** for just one user listening to 3 songs (~10-12 minutes).

### Root Cause
The `PlaybackManager.tick()` function runs **every second** for each active room and was making **3-4 Redis reads per tick**:

1. `getState(roomId)` 
2. `getQueue(roomId)`
3. `getLoopMode(roomId)`
4. `getAutoPlayState(roomId)` (when queue ≤ 2)

**For 3 songs (~600-720 seconds):**
- 600-720 ticks
- **1800-2160+ Redis reads** minimum
- Plus additional reads during auto-play refills

## Solution: In-Memory Caching

### Implementation
Added a cache layer to `PlaybackManager` that:

1. **Caches frequently-read data** in memory (state, queue, loopMode, autoPlayState)
2. **10-second TTL** - cache refreshes automatically after 10 seconds
3. **Cache invalidation** - whenever data is modified, cache is immediately cleared
4. **Parallel Redis fetches** - when cache is stale, all 4 values are fetched in parallel using `Promise.all()`

### Code Changes

#### New Cache System (`playbackManager.js`)
```javascript
// Cache structure
this.cache = new Map(); // roomId -> { state, queue, loopMode, autoPlayState, lastUpdate }
this.CACHE_TTL = 10000; // 10 seconds

// Get cached data or fetch from Redis if stale
async getCachedRoomData(roomId, forceRefresh = false) {
    const now = Date.now();
    const cached = this.cache.get(roomId);

    // Return cache if fresh (less than 10 seconds old)
    if (!forceRefresh && cached && (now - cached.lastUpdate) < this.CACHE_TTL) {
        return cached;
    }

    // Fetch fresh data from Redis (parallel)
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

// Invalidate cache when data changes
invalidateCache(roomId) {
    this.cache.delete(roomId);
}
```

#### Updated tick() Function
```javascript
async tick(roomId) {
    // OLD: 3-4 Redis reads every second
    // const state = await queueService.getState(roomId);
    // const queue = await queueService.getQueue(roomId);
    // const loopMode = await queueService.getLoopMode(roomId);
    
    // NEW: Use cached data (only reads from Redis every 10 seconds)
    const roomData = await this.getCachedRoomData(roomId);
    const { state, queue, loopMode, autoPlayState } = roomData;
    
    // ... rest of tick logic
}
```

#### Cache Invalidation Points
Cache is invalidated whenever data is modified:
- `handlePlayPause()` - when play/pause state changes
- `handleSeek()` - when seeking
- `playNextSong()` - when advancing to next song
- `handleSongEnd()` - when song ends (loop or advance)
- Auto-play queue refills
- Loop mode changes
- `stopRoom()` - cleanup

## Performance Impact

### Before (Per Room, Per Second)
- **3-4 Redis reads** every second
- **~180-240 reads/minute**
- **~2160-2880 reads** for 3 songs (12 minutes)

### After (Per Room, Per Second)
- **0 Redis reads** for 9 out of 10 seconds (cache hit)
- **4 Redis reads** every 10th second (cache refresh)
- **~24 reads/minute** (90% reduction)
- **~288 reads** for 3 songs (12 minutes)

### Overall Reduction
- **~90-95% reduction** in Redis read commands
- **From 2300+ to ~300 reads** for the same usage
- Scales linearly with number of active rooms

## Benefits
1. ✅ **Massive cost savings** on Redis operations
2. ✅ **Reduced latency** - in-memory reads are instant
3. ✅ **Better scalability** - can handle more concurrent rooms
4. ✅ **No functionality loss** - 10-second cache is fresh enough for music playback
5. ✅ **Automatic cleanup** - cache cleared when rooms stop

## Safety Measures
1. **Cache invalidation** ensures data consistency
2. **10-second TTL** prevents stale data from persisting
3. **Force refresh option** available if needed
4. **Parallel fetching** minimizes latency on cache miss

## Testing Recommendations
1. Monitor Redis command count with 1 user, 3 songs
2. Verify playback sync across multiple clients
3. Test cache invalidation (pause/play, skip, seek)
4. Verify auto-play still works correctly
5. Check memory usage doesn't grow unbounded

## Expected Results
- **Before:** 2300+ Redis reads for 1 user, 3 songs
- **After:** ~300 Redis reads for 1 user, 3 songs
- **Savings:** ~87% reduction in Redis usage
