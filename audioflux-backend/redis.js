/**
 * redis.js — Full exports for server.js compatibility
 * Optimized with connection pooling and memory management
 */

const Redis = require("ioredis");

// Optimized Redis client with connection pooling
const client = new Redis(process.env.REDIS_URL, {
  tls: process.env.REDIS_URL?.includes("upstash") ? {} : undefined,
  // Connection pooling settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  // Memory optimization
  lazyConnect: false,
  // Connection pool settings
  connectionName: 'audioflux-main',
  // Reconnection strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Keep-alive to reuse connections
  keepAlive: 30000,
  // Reduce memory usage
  dropBufferSupport: true,
});

// ---------------- QUEUE SYSTEM ----------------

async function getQueue(groupId) {
  const raw = await client.get(`queue:${groupId}`);
  return raw ? JSON.parse(raw) : [];
}

async function setQueue(groupId, queue) {
  await client.set(`queue:${groupId}`, JSON.stringify(queue));
}

async function addSong(groupId, song) {
  const q = await getQueue(groupId);
  q.push(song);
  await setQueue(groupId, q);
}

async function removeSong(groupId, index) {
  const q = await getQueue(groupId);
  if (index >= 0 && index < q.length) q.splice(index, 1);
  await setQueue(groupId, q);
}

async function clearQueue(groupId) {
  await client.del(`queue:${groupId}`);
}

// ---------------- STATE SYSTEM ----------------

async function getState(groupId) {
  const raw = await client.get(`state:${groupId}`);
  return raw ? JSON.parse(raw) : null;
}

async function setState(groupId, state) {
  await client.set(`state:${groupId}`, JSON.stringify(state));
}

// ---------------- LOOP SYSTEM ----------------

async function setLoopMode(groupId, loopMode) {
  // loopMode: 'none', 'one', 'all'
  await client.set(`loop:${groupId}`, loopMode);
  await client.expire(`loop:${groupId}`, 86400);
}

async function getLoopMode(groupId) {
  const mode = await client.get(`loop:${groupId}`);
  return mode || 'none';
}

// ---------------- TTL MANAGEMENT ----------------

async function extendTTL(groupId) {
  await client.expire(`queue:${groupId}`, 86400);
  await client.expire(`state:${groupId}`, 86400);
  await client.expire(`viewers:${groupId}`, 86400);
  await client.expire(`progress:${groupId}`, 86400);
  await client.expire(`loop:${groupId}`, 86400);
}

// ---------------- VIEWERS SYSTEM ----------------

async function addViewer(groupId, viewerId, userProfile) {
  const key = `viewers:${groupId}`;
  await client.hset(key, viewerId.toString(), JSON.stringify(userProfile));
  await client.expire(key, 86400);
}

async function removeViewer(groupId, viewerId) {
  const key = `viewers:${groupId}`;
  await client.hdel(key, viewerId.toString());
}

async function getViewers(groupId) {
  const key = `viewers:${groupId}`;
  const viewersObj = await client.hgetall(key);

  if (!viewersObj || Object.keys(viewersObj).length === 0) {
    return [];
  }

  return Object.values(viewersObj)
    .filter(v => v && v.trim() !== '') // Filter out empty values
    .map(v => {
      try {
        return JSON.parse(v);
      } catch (e) {
        console.error('[Redis] Failed to parse viewer data:', e.message);
        return null;
      }
    })
    .filter(v => v !== null); // Remove failed parses
}

async function setProgress(groupId, progress) {
  const key = `progress:${groupId}`;
  await client.set(key, JSON.stringify(progress));
  await client.expire(key, 86400);
}

async function getProgress(groupId) {
  const key = `progress:${groupId}`;
  const raw = await client.get(key);
  return raw ? JSON.parse(raw) : null;
}

// ---------------- SKIP VOTE SYSTEM ----------------

async function addVote(groupId, uid) {
  await client.sadd(`votes:${groupId}`, uid);
}

async function getVotes(groupId) {
  return await client.smembers(`votes:${groupId}`);
}

async function resetVotes(groupId) {
  await client.del(`votes:${groupId}`);
}

// ---------------- ROLE SYSTEM ----------------

// OWNER
async function setOwner(groupId, uid) {
  await client.set(`owner:${groupId}`, uid);
}

async function getOwner(groupId) {
  return await client.get(`owner:${groupId}`);
}

// MODERATORS
async function addModerator(groupId, uid) {
  await client.sadd(`mods:${groupId}`, uid);
}

async function removeModerator(groupId, uid) {
  await client.srem(`mods:${groupId}`, uid);
}

async function isModerator(groupId, uid) {
  return await client.sismember(`mods:${groupId}`, uid);
}

// APPROVED USERS
async function addApproved(groupId, uid) {
  await client.sadd(`approved:${groupId}`, uid);
}

async function removeApproved(groupId, uid) {
  await client.srem(`approved:${groupId}`, uid);
}

async function isApproved(groupId, uid) {
  return await client.sismember(`approved:${groupId}`, uid);
}

// ---------------- BAN SYSTEM ----------------

async function banUser(groupId, uid) {
  await client.sadd(`banned:${groupId}`, uid);
}

async function unbanUser(groupId, uid) {
  await client.srem(`banned:${groupId}`, uid);
}

async function isBanned(groupId, uid) {
  return await client.sismember(`banned:${groupId}`, uid);
}

// ---------------- USER STATISTICS SYSTEM ----------------

async function incrementSongsAdded(userId) {
  const key = `user_stats:${userId}:songs_added`;
  await client.incr(key);
}

async function addListeningSession(userId, roomId, minutes) {
  const key = `user_stats:${userId}:minutes_listened`;
  const current = await client.get(key);
  const total = (parseInt(current) || 0) + minutes;
  await client.set(key, total);

  // Track unique rooms
  await client.sadd(`user_stats:${userId}:rooms`, roomId);
}

async function getUserStats(userId) {
  const songsAdded = await client.get(`user_stats:${userId}:songs_added`) || 0;
  const minutesListened = await client.get(`user_stats:${userId}:minutes_listened`) || 0;
  const roomsJoined = await client.scard(`user_stats:${userId}:rooms`) || 0;

  return {
    songsAdded: parseInt(songsAdded),
    minutesListened: parseInt(minutesListened),
    roomsJoined: parseInt(roomsJoined)
  };
}

// ---------------- LIKED SONGS SYSTEM ----------------

async function likeSong(userId, song) {
  const key = `liked_songs:${userId}`;
  const songWithTimestamp = {
    ...song,
    likedAt: new Date().toISOString()
  };

  // Check if already liked
  const existing = await client.hget(key, song.id);
  if (existing) {
    return false; // Already liked
  }

  await client.hset(key, song.id, JSON.stringify(songWithTimestamp));
  return true;
}

async function unlikeSong(userId, songId) {
  const key = `liked_songs:${userId}`;
  const result = await client.hdel(key, songId);
  return result > 0;
}

async function getLikedSongs(userId) {
  const key = `liked_songs:${userId}`;
  const songsObj = await client.hgetall(key);

  if (!songsObj || Object.keys(songsObj).length === 0) {
    return [];
  }

  return Object.values(songsObj).map(s => JSON.parse(s));
}

async function isLiked(userId, songId) {
  const key = `liked_songs:${userId}`;
  const result = await client.hexists(key, songId);
  return result === 1;
}

// ---------------- PLAYLIST SYSTEM ----------------

async function addToPlaylist(userId, song) {
  const key = `playlist:${userId}`;
  const songWithTimestamp = {
    ...song,
    addedAt: new Date().toISOString()
  };

  // Check if already in playlist
  const existing = await client.hget(key, song.id);
  if (existing) {
    return false; // Already in playlist
  }

  await client.hset(key, song.id, JSON.stringify(songWithTimestamp));
  return true;
}

async function removeFromPlaylist(userId, songId) {
  const key = `playlist:${userId}`;
  const result = await client.hdel(key, songId);
  return result > 0;
}

async function getPlaylist(userId) {
  const key = `playlist:${userId}`;
  const songsObj = await client.hgetall(key);

  if (!songsObj || Object.keys(songsObj).length === 0) {
    return [];
  }

  return Object.values(songsObj).map(s => JSON.parse(s));
}

async function isInPlaylist(userId, songId) {
  const key = `playlist:${userId}`;
  const result = await client.hexists(key, songId);
  return result === 1;
}

async function clearPlaylist(userId) {
  const key = `playlist:${userId}`;
  await client.del(key);
}

// ---------------- PRIVATE ROOM SYSTEM ----------------

// Set room metadata (for private rooms created via bot DM)
async function setRoomMetadata(roomId, metadata) {
  const key = `room_meta:${roomId}`;
  await client.set(key, JSON.stringify(metadata), 'EX', 86400 * 7); // 7 days
}

async function getRoomMetadata(roomId) {
  const key = `room_meta:${roomId}`;
  const raw = await client.get(key);
  return raw ? JSON.parse(raw) : null;
}

// Check if room is private (created via bot DM)
async function isPrivateRoom(roomId) {
  const metadata = await getRoomMetadata(roomId);
  return metadata?.isPrivate === true;
}

// Get room owner (for private rooms)
async function getPrivateRoomOwner(roomId) {
  const metadata = await getRoomMetadata(roomId);
  return metadata?.ownerId || null;
}

// ---------------- INVITE ANALYTICS ----------------

// Track who joined via invite link
async function addRoomMember(roomId, userId, userName) {
  const key = `room_members:${roomId}`;
  const member = {
    userId,
    userName,
    joinedAt: Date.now()
  };
  await client.sadd(key, JSON.stringify(member));
  await client.expire(key, 86400 * 7); // 7 days
}

async function getRoomMembers(roomId) {
  const key = `room_members:${roomId}`;
  const members = await client.smembers(key);
  return members.map(m => JSON.parse(m));
}

async function getRoomMemberCount(roomId) {
  const key = `room_members:${roomId}`;
  return await client.scard(key);
}

// ---------------- BLOCKED USERS ----------------

// Block user from private room
async function blockUserFromRoom(roomId, userId) {
  const key = `room_blocked:${roomId}`;
  await client.sadd(key, userId.toString());
  await client.expire(key, 86400 * 7); // 7 days
}

async function unblockUserFromRoom(roomId, userId) {
  const key = `room_blocked:${roomId}`;
  await client.srem(key, userId.toString());
}

async function isUserBlockedFromRoom(roomId, userId) {
  const key = `room_blocked:${roomId}`;
  return await client.sismember(key, userId.toString());
}

async function getBlockedUsers(roomId) {
  const key = `room_blocked:${roomId}`;
  return await client.smembers(key);
}

// ---------------- RATE LIMITING ----------------

// Check if user can create a room (1 room per user)
async function canCreateRoom(userId) {
  const key = `user_room:${userId}`;
  const existingRoom = await client.get(key);
  return !existingRoom;
}

async function setUserRoom(userId, roomId) {
  const key = `user_room:${userId}`;
  await client.set(key, roomId, 'EX', 86400 * 7); // 7 days
}

async function getUserRoom(userId) {
  const key = `user_room:${userId}`;
  return await client.get(key);
}

// Rate limit invite link generation (prevent spam)
async function canGenerateInvite(userId) {
  const key = `invite_limit:${userId}`;
  const count = await client.get(key);
  return !count || parseInt(count) < 5; // Max 5 invites per hour
}

async function incrementInviteGeneration(userId) {
  const key = `invite_limit:${userId}`;
  const current = await client.incr(key);
  if (current === 1) {
    await client.expire(key, 3600); // 1 hour
  }
  return current;
}

// ---------------- INVITE REVOCATION ----------------

// Revoke old invite and generate new one
async function revokeInvite(roomId) {
  const metadata = await getRoomMetadata(roomId);
  if (!metadata) return null;

  // Update invite version to invalidate old links
  metadata.inviteVersion = (metadata.inviteVersion || 0) + 1;
  metadata.lastInviteRevoke = Date.now();

  await setRoomMetadata(roomId, metadata);
  return metadata.inviteVersion;
}

async function isInviteValid(roomId, version) {
  const metadata = await getRoomMetadata(roomId);
  if (!metadata) return false;

  const currentVersion = metadata.inviteVersion || 0;
  return !version || parseInt(version) === currentVersion;
}

module.exports = {
  client,

  // queue
  getQueue, setQueue, addSong, removeSong, clearQueue,

  // state
  getState, setState, extendTTL,

  // loop
  setLoopMode, getLoopMode,

  // votes
  addVote, getVotes, resetVotes,

  // viewers
  addViewer, removeViewer, getViewers,

  setProgress, getProgress,

  // roles
  setOwner, getOwner,
  addModerator, removeModerator, isModerator,
  addApproved, removeApproved, isApproved,

  // ban system
  banUser, unbanUser, isBanned,

  // user statistics
  incrementSongsAdded, addListeningSession, getUserStats,

  // liked songs
  likeSong, unlikeSong, getLikedSongs, isLiked,

  // playlist
  addToPlaylist, removeFromPlaylist, getPlaylist, isInPlaylist, clearPlaylist,

  // private rooms
  setRoomMetadata, getRoomMetadata, isPrivateRoom, getPrivateRoomOwner,

  // invite analytics
  addRoomMember, getRoomMembers, getRoomMemberCount,

  // blocking
  blockUserFromRoom, unblockUserFromRoom, isUserBlockedFromRoom, getBlockedUsers,

  // rate limiting
  canCreateRoom, setUserRoom, getUserRoom,
  canGenerateInvite, incrementInviteGeneration,

  // invite revocation
  revokeInvite, isInviteValid
};
