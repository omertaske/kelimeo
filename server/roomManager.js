// ROOM-LEVEL MATCHING - tüm eşleşmeler oda içinde

/**
 * Room Manager
 * Her odanın state'ini yönetir ve oda-bazlı eşleştirme için veri sağlar
 */
class RoomManager {
  constructor() {
    // rooms = { roomId: { activeUsers: Set<userId>, processing: bool, matches: Map<matchId, {a,b}>, userSockets: Map<userId, socketId> } }
    this.rooms = new Map();
    
    // Initialize 10 rooms (room_1 to room_10)
    for (let i = 1; i <= 10; i++) {
      const roomId = `room_${i}`;
      this.rooms.set(roomId, {
        activeUsers: new Set(),        // Aktif kullanıcılar
        processing: false,             // Eşleştirme işlemi devam ediyor mu?
        matches: new Map(),            // matchId -> { player1, player2, createdAt }
        userSockets: new Map(),        // userId -> socketId mapping
        lastMatchAttempt: null,        // Son eşleştirme denemesi zamanı
      });
    }
    
    console.log('🏠 RoomManager initialized with 10 rooms');
  }

  /**
   * Get room state
   * @param {string} roomId 
   * @returns {Object} Room state
   */
  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} not found`);
    }
    return this.rooms.get(roomId);
  }

  /**
   * Check if room exists
   * @param {string} roomId 
   * @returns {boolean}
   */
  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * Add user to room
   * @param {string} roomId 
   * @param {string} userId 
   * @param {string} socketId 
   */
  addUserToRoom(roomId, userId, socketId) {
    const room = this.getRoom(roomId);
    
    // Remove user from other rooms first
    this.removeUserFromAllRooms(userId);
    
    room.activeUsers.add(userId);
    room.userSockets.set(userId, socketId);
    
    console.log(`👤 User ${userId} added to ${roomId} (${room.activeUsers.size} active)`);
  }

  /**
   * Remove user from specific room
   * @param {string} roomId 
   * @param {string} userId 
   */
  removeUserFromRoom(roomId, userId) {
    if (!this.hasRoom(roomId)) return;
    
    const room = this.getRoom(roomId);
    room.activeUsers.delete(userId);
    room.userSockets.delete(userId);
    
    // Cancel any matches involving this user
    this.cancelMatchesForUser(roomId, userId);
    
    console.log(`👤 User ${userId} removed from ${roomId} (${room.activeUsers.size} active)`);
  }

  /**
   * Remove user from all rooms
   * @param {string} userId 
   */
  removeUserFromAllRooms(userId) {
    for (const [roomId, room] of this.rooms) {
      if (room.activeUsers.has(userId)) {
        this.removeUserFromRoom(roomId, userId);
      }
    }
  }

  /**
   * Set user active/inactive in a room
   * @param {string} roomId 
   * @param {string} userId 
   * @param {boolean} active 
   */
  setUserActive(roomId, userId, active) {
    const room = this.getRoom(roomId);
    
    if (active) {
      room.activeUsers.add(userId);
      console.log(`✅ User ${userId} set active in ${roomId}`);
    } else {
      room.activeUsers.delete(userId);
      console.log(`❌ User ${userId} set inactive in ${roomId}`);
    }
  }

  /**
   * Get socket ID for a user in a room
   * @param {string} roomId 
   * @param {string} userId 
   * @returns {string|null}
   */
  getUserSocket(roomId, userId) {
    const room = this.getRoom(roomId);
    return room.userSockets.get(userId) || null;
  }

  /**
   * Get active users in a room
   * @param {string} roomId 
   * @returns {Array<string>}
   */
  getActiveUsers(roomId) {
    const room = this.getRoom(roomId);
    return Array.from(room.activeUsers);
  }

  /**
   * Get active user count
   * @param {string} roomId 
   * @returns {number}
   */
  getActiveUserCount(roomId) {
    const room = this.getRoom(roomId);
    return room.activeUsers.size;
  }

  /**
   * Check if room is currently processing matches
   * @param {string} roomId 
   * @returns {boolean}
   */
  isProcessing(roomId) {
    const room = this.getRoom(roomId);
    return room.processing;
  }

  /**
   * Set room processing state
   * @param {string} roomId 
   * @param {boolean} processing 
   */
  setProcessing(roomId, processing) {
    const room = this.getRoom(roomId);
    room.processing = processing;
  }

  /**
   * Add a match to room
   * @param {string} roomId 
   * @param {string} matchId 
   * @param {string} player1 
   * @param {string} player2 
   */
  addMatch(roomId, matchId, player1, player2) {
    const room = this.getRoom(roomId);
    room.matches.set(matchId, {
      player1,
      player2,
      createdAt: new Date().toISOString()
    });
    
    console.log(`🎮 Match created: ${matchId} (${player1} vs ${player2}) in ${roomId}`);
  }

  /**
   * Get match by ID
   * @param {string} roomId 
   * @param {string} matchId 
   * @returns {Object|null}
   */
  getMatch(roomId, matchId) {
    const room = this.getRoom(roomId);
    return room.matches.get(matchId) || null;
  }

  /**
   * Remove match
   * @param {string} roomId 
   * @param {string} matchId 
   */
  removeMatch(roomId, matchId) {
    const room = this.getRoom(roomId);
    room.matches.delete(matchId);
  }

  /**
   * Cancel all matches for a user
   * @param {string} roomId 
   * @param {string} userId 
   * @returns {Array<string>} Cancelled match IDs
   */
  cancelMatchesForUser(roomId, userId) {
    const room = this.getRoom(roomId);
    const cancelledMatches = [];
    
    for (const [matchId, match] of room.matches) {
      if (match.player1 === userId || match.player2 === userId) {
        cancelledMatches.push(matchId);
        room.matches.delete(matchId);
      }
    }
    
    if (cancelledMatches.length > 0) {
      console.log(`❌ Cancelled ${cancelledMatches.length} matches for user ${userId} in ${roomId}`);
    }
    
    return cancelledMatches;
  }

  /**
   * Update last match attempt time
   * @param {string} roomId 
   */
  updateLastMatchAttempt(roomId) {
    const room = this.getRoom(roomId);
    room.lastMatchAttempt = Date.now();
  }

  /**
   * Get server statistics
   * @returns {Object}
   */
  getServerStats() {
    const stats = {
      totalRooms: this.rooms.size,
      rooms: {}
    };
    
    for (const [roomId, room] of this.rooms) {
      stats.rooms[roomId] = {
        activeUsers: room.activeUsers.size,
        activeMatches: room.matches.size,
        processing: room.processing,
        lastMatchAttempt: room.lastMatchAttempt
      };
    }
    
    return stats;
  }
}

module.exports = { RoomManager };
