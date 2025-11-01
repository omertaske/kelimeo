// ROOM-LEVEL MATCHING — tüm eşleşmeler burada yapılır

const { v4: uuidv4 } = require('uuid');

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array 
 * @returns {Array} Shuffled array
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Match users in a room (ATOMIC operation)
 * @param {string} roomId 
 * @param {Object} roomManager 
 * @param {Object} io - Socket.io server instance
 * @returns {Object} Matching result
 */
async function matchRoom(roomId, roomManager, io) {
  console.log(`\n🎯 ROOM_MATCH attempting for ${roomId}...`);
  
  // a) Check if already processing
  if (roomManager.isProcessing(roomId)) {
    console.log(`⏸️  ${roomId} is already processing, skipping...`);
    return { success: false, reason: 'already_processing' };
  }
  
  try {
    // b) Set processing flag (ATOMIC LOCK)
    roomManager.setProcessing(roomId, true);
    console.log(`🔒 ${roomId} locked for matching`);
    
    // c) Get active users
    const activeUsers = roomManager.getActiveUsers(roomId);
    console.log(`👥 ${roomId} has ${activeUsers.length} active users`);
    
    // Not enough users to match
    if (activeUsers.length < 2) {
      console.log(`⏳ ${roomId} needs at least 2 users to match (currently ${activeUsers.length})`);
      roomManager.setProcessing(roomId, false);
      
      // Emit queue status to waiting users
      activeUsers.forEach(userId => {
        const socketId = roomManager.getUserSocket(roomId, userId);
        if (socketId) {
          io.to(socketId).emit('queueStatus', {
            roomId,
            waitingCount: activeUsers.length,
            needsMore: 2 - activeUsers.length
          });
        }
      });
      
      return { success: false, reason: 'not_enough_users', waitingCount: activeUsers.length };
    }
    
    // d) Shuffle users (Fisher-Yates)
    const shuffledUsers = shuffle(activeUsers);
    console.log(`🎲 Shuffled users: ${shuffledUsers.join(', ')}`);
    
    // e) Create pairs
    const pairs = [];
    const matched = [];
    
    // f) Pair users
    for (let i = 0; i + 1 < shuffledUsers.length; i += 2) {
      pairs.push([shuffledUsers[i], shuffledUsers[i + 1]]);
      matched.push(shuffledUsers[i], shuffledUsers[i + 1]);
    }
    
    // g) Check for odd user left
    const oddUser = shuffledUsers.length % 2 !== 0 ? shuffledUsers[shuffledUsers.length - 1] : null;
    
    console.log(`✅ Created ${pairs.length} pairs`);
    if (oddUser) {
      console.log(`⏳ Odd user left in queue: ${oddUser}`);
    }
    
    // h) Create matches and store
    const createdMatches = [];
    
    for (const [player1, player2] of pairs) {
      const matchId = uuidv4();
      
      // Add match to room
      roomManager.addMatch(roomId, matchId, player1, player2);
      
      createdMatches.push({ matchId, player1, player2 });
      
      console.log(`🎮 ROOM_MATCH ${roomId} ${matchId} users[${player1}, ${player2}]`);
    }
    
    // i) Emit "matched" events to each user
    for (const { matchId, player1, player2 } of createdMatches) {
      // Get socket IDs
      const player1SocketId = roomManager.getUserSocket(roomId, player1);
      const player2SocketId = roomManager.getUserSocket(roomId, player2);
      
      // Emit to player 1
      if (player1SocketId) {
        io.to(player1SocketId).emit('matched', {
          matchId,
          partnerId: player2,
          roomId,
          role: 'player1',
          timestamp: new Date().toISOString()
        });
        console.log(`✉️  Sent "matched" to ${player1} (partner: ${player2})`);
      }
      
      // Emit to player 2
      if (player2SocketId) {
        io.to(player2SocketId).emit('matched', {
          matchId,
          partnerId: player1,
          roomId,
          role: 'player2',
          timestamp: new Date().toISOString()
        });
        console.log(`✉️  Sent "matched" to ${player2} (partner: ${player1})`);
      }
      
      // Remove matched users from active queue
      roomManager.setUserActive(roomId, player1, false);
      roomManager.setUserActive(roomId, player2, false);
    }
    
    // Send queue status to odd user if exists
    if (oddUser) {
      const oddUserSocketId = roomManager.getUserSocket(roomId, oddUser);
      if (oddUserSocketId) {
        io.to(oddUserSocketId).emit('queueStatus', {
          roomId,
          waitingCount: 1,
          message: 'Waiting for another player...'
        });
      }
    }
    
    // Update last match attempt
    roomManager.updateLastMatchAttempt(roomId);
    
    // j) Release processing flag
    roomManager.setProcessing(roomId, false);
    console.log(`🔓 ${roomId} unlocked\n`);
    
    return {
      success: true,
      pairsCreated: pairs.length,
      oddUser,
      matches: createdMatches
    };
    
  } catch (error) {
    // Always release lock on error
    roomManager.setProcessing(roomId, false);
    console.error(`❌ Error in matchRoom for ${roomId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Debounced match trigger
 * Prevents multiple simultaneous match attempts
 */
class MatchDebouncer {
  constructor(delay = 500) {
    this.timers = new Map(); // roomId -> timeoutId
    this.delay = delay;
  }

  /**
   * Schedule a match attempt with debounce
   * @param {string} roomId 
   * @param {Function} callback 
   */
  scheduleMatch(roomId, callback) {
    // Clear existing timer for this room
    if (this.timers.has(roomId)) {
      clearTimeout(this.timers.get(roomId));
    }
    
    // Set new timer
    const timerId = setTimeout(() => {
      this.timers.delete(roomId);
      callback();
    }, this.delay);
    
    this.timers.set(roomId, timerId);
  }

  /**
   * Clear timer for a room
   * @param {string} roomId 
   */
  clear(roomId) {
    if (this.timers.has(roomId)) {
      clearTimeout(this.timers.get(roomId));
      this.timers.delete(roomId);
    }
  }

  /**
   * Clear all timers
   */
  clearAll() {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
  }
}

module.exports = {
  matchRoom,
  shuffle,
  MatchDebouncer
};
