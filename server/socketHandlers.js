const { matchRoom, MatchDebouncer } = require('./matchingEngine');

// Create debouncer instance (500ms delay to batch simultaneous joins)
const matchDebouncer = new MatchDebouncer(500);

/**
 * Setup all socket event handlers
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Individual socket connection
 * @param {Object} roomManager - Room manager instance
 */
function setupSocketHandlers(io, socket, roomManager) {
  
  /**
   * User enters a room
   * Event: 'enterRoom'
   * Payload: { roomId, userId }
   */
  socket.on('enterRoom', async ({ roomId, userId }) => {
    try {
      console.log(`📥 enterRoom: ${userId} -> ${roomId} (socket: ${socket.id})`);
      
      // Validate room exists
      if (!roomManager.hasRoom(roomId)) {
        socket.emit('error', { message: `Room ${roomId} does not exist` });
        return;
      }
      
      // Add user to room
      roomManager.addUserToRoom(roomId, userId, socket.id);
      
      // Join socket.io room for broadcasting
      socket.join(roomId);
      
      // Store userId in socket data for cleanup on disconnect
      socket.data.userId = userId;
      socket.data.currentRoom = roomId;
      
      // Send confirmation
      socket.emit('roomJoined', {
        roomId,
        userId,
        activeCount: roomManager.getActiveUserCount(roomId)
      });
      
      // Trigger matching with debounce (batches rapid joins)
      matchDebouncer.scheduleMatch(roomId, async () => {
        await matchRoom(roomId, roomManager, io);
      });
      
    } catch (error) {
      console.error('❌ Error in enterRoom:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * User leaves a room
   * Event: 'leaveRoom'
   * Payload: { roomId, userId }
   */
  socket.on('leaveRoom', ({ roomId, userId }) => {
    try {
      console.log(`📤 leaveRoom: ${userId} <- ${roomId}`);
      
      if (!roomManager.hasRoom(roomId)) {
        return;
      }
      
      // Cancel any matches for this user
      const cancelledMatches = roomManager.cancelMatchesForUser(roomId, userId);
      
      // Notify partners if matches were cancelled
      cancelledMatches.forEach(matchId => {
        const match = roomManager.getMatch(roomId, matchId);
        if (match) {
          const partnerId = match.player1 === userId ? match.player2 : match.player1;
          const partnerSocketId = roomManager.getUserSocket(roomId, partnerId);
          
          if (partnerSocketId) {
            io.to(partnerSocketId).emit('matchCancelled', {
              matchId,
              reason: 'partner_left',
              partnerId: userId
            });
            
            // Re-add partner to active queue
            roomManager.setUserActive(roomId, partnerId, true);
          }
        }
      });
      
      // Remove user from room
      roomManager.removeUserFromRoom(roomId, userId);
      
      // Leave socket.io room
      socket.leave(roomId);
      
      // Clear socket data
      if (socket.data.currentRoom === roomId) {
        socket.data.currentRoom = null;
      }
      
      // Send confirmation
      socket.emit('roomLeft', { roomId, userId });
      
    } catch (error) {
      console.error('❌ Error in leaveRoom:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * User sets active/inactive status
   * Event: 'setActive'
   * Payload: { roomId, userId, active: true|false }
   */
  socket.on('setActive', async ({ roomId, userId, active }) => {
    try {
      console.log(`🎯 setActive: ${userId} in ${roomId} = ${active}`);
      
      if (!roomManager.hasRoom(roomId)) {
        socket.emit('error', { message: `Room ${roomId} does not exist` });
        return;
      }
      
      // Set user active status
      roomManager.setUserActive(roomId, userId, active);
      
      // Send confirmation
      socket.emit('activeStatusChanged', { roomId, userId, active });
      
      // Trigger matching if user became active
      if (active) {
        matchDebouncer.scheduleMatch(roomId, async () => {
          await matchRoom(roomId, roomManager, io);
        });
      }
      
    } catch (error) {
      console.error('❌ Error in setActive:', error);
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * User cancels matchmaking
   * Event: 'cancelMatchmaking'
   * Payload: { roomId, userId }
   */
  socket.on('cancelMatchmaking', ({ roomId, userId }) => {
    try {
      console.log(`❌ cancelMatchmaking: ${userId} in ${roomId}`);
      
      if (!roomManager.hasRoom(roomId)) {
        return;
      }
      
      // Set user inactive
      roomManager.setUserActive(roomId, userId, false);
      
      // Cancel any pending matches
      const cancelledMatches = roomManager.cancelMatchesForUser(roomId, userId);
      
      socket.emit('matchmakingCancelled', {
        roomId,
        userId,
        cancelledMatches: cancelledMatches.length
      });
      
    } catch (error) {
      console.error('❌ Error in cancelMatchmaking:', error);
    }
  });

  /**
   * User accepts a match
   * Event: 'acceptMatch'
   * Payload: { roomId, matchId, userId }
   */
  socket.on('acceptMatch', ({ roomId, matchId, userId }) => {
    try {
      console.log(`✅ acceptMatch: ${userId} accepted ${matchId} in ${roomId}`);
      
      const match = roomManager.getMatch(roomId, matchId);
      
      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }
      
      // Emit to both players that match was accepted
      const player1SocketId = roomManager.getUserSocket(roomId, match.player1);
      const player2SocketId = roomManager.getUserSocket(roomId, match.player2);
      
      if (player1SocketId) {
        io.to(player1SocketId).emit('matchAccepted', { matchId, roomId, userId });
      }
      
      if (player2SocketId) {
        io.to(player2SocketId).emit('matchAccepted', { matchId, roomId, userId });
      }
      
    } catch (error) {
      console.error('❌ Error in acceptMatch:', error);
    }
  });

  /**
   * Get room status
   * Event: 'getRoomStatus'
   * Payload: { roomId }
   */
  socket.on('getRoomStatus', ({ roomId }) => {
    try {
      if (!roomManager.hasRoom(roomId)) {
        socket.emit('error', { message: `Room ${roomId} does not exist` });
        return;
      }
      
      const room = roomManager.getRoom(roomId);
      
      socket.emit('roomStatus', {
        roomId,
        activeUsers: room.activeUsers.size,
        activeMatches: room.matches.size,
        processing: room.processing
      });
      
    } catch (error) {
      console.error('❌ Error in getRoomStatus:', error);
    }
  });

  /**
   * Handle socket disconnect
   * Automatically cleanup user from all rooms
   */
  socket.on('disconnect', () => {
    try {
      const userId = socket.data.userId;
      const currentRoom = socket.data.currentRoom;
      
      if (!userId) return;
      
      console.log(`🔌 User ${userId} disconnected from socket ${socket.id}`);
      
      // Remove from current room if exists
      if (currentRoom && roomManager.hasRoom(currentRoom)) {
        // Cancel matches
        const cancelledMatches = roomManager.cancelMatchesForUser(currentRoom, userId);
        
        // Notify partners
        cancelledMatches.forEach(matchId => {
          const match = roomManager.getMatch(currentRoom, matchId);
          if (match) {
            const partnerId = match.player1 === userId ? match.player2 : match.player1;
            const partnerSocketId = roomManager.getUserSocket(currentRoom, partnerId);
            
            if (partnerSocketId) {
              io.to(partnerSocketId).emit('matchCancelled', {
                matchId,
                reason: 'partner_disconnected',
                partnerId: userId
              });
              
              // Re-add to queue
              roomManager.setUserActive(currentRoom, partnerId, true);
            }
          }
        });
        
        // Remove user
        roomManager.removeUserFromRoom(currentRoom, userId);
      }
      
      // Also remove from all rooms (safety cleanup)
      roomManager.removeUserFromAllRooms(userId);
      
    } catch (error) {
      console.error('❌ Error in disconnect handler:', error);
    }
  });
}

module.exports = { setupSocketHandlers };
