const { matchRoom, MatchDebouncer } = require('./matchingEngine');

// Create debouncer instance (500ms delay to batch simultaneous joins)
const matchDebouncer = new MatchDebouncer(500);

/**
 * Setup all socket event handlers
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Individual socket connection
 * @param {Object} roomManager - Room manager instance
 */
function setupSocketHandlers(io, socket, roomManager, gameStateManager) {
  const { validateWords } = require('./services/dictionaryService');
  const { toUpperCaseTurkish } = require('./utils/stringUtils');
  // Timers
  const turnTimers = new Map(); // matchId -> timeoutId
  const disconnectTimers = new Map(); // `${matchId}:${userId}` -> timeoutId

  const CLEAR_TURN_TIMER = (matchId) => {
    if (turnTimers.has(matchId)) {
      clearTimeout(turnTimers.get(matchId));
      turnTimers.delete(matchId);
    }
  };

  const CLEAR_DISCONNECT_TIMER = (matchId, userId) => {
    const key = `${matchId}:${userId}`;
    if (disconnectTimers.has(key)) {
      clearTimeout(disconnectTimers.get(key));
      disconnectTimers.delete(key);
    }
  };

  const SCHEDULE_TURN_TIMER = (matchId, roomId) => {
    CLEAR_TURN_TIMER(matchId);
    const timeoutMs = 30000; // 30s per turn
    const t = setTimeout(() => {
      try {
        const state = gameStateManager.getState(matchId);
        if (!state || state.status !== 'playing') return;
        const offenderId = state.currentTurn;
        const nextState = gameStateManager.passTurn(matchId, offenderId);
        // Track timeouts per user (simple end condition)
        nextState.timeoutCounts[offenderId] = (nextState.timeoutCounts[offenderId] || 0) + 1;

        io.to(matchId).emit('turn_changed', { matchId, currentTurn: nextState.currentTurn, reason: 'timeout' });

        // If user timed out twice → opponent wins
        if (nextState.timeoutCounts[offenderId] >= 2) {
          const opponentId = nextState.players.player1 === offenderId ? nextState.players.player2 : nextState.players.player1;
          const gameOver = gameStateManager.endGame(matchId, { winner: opponentId, reason: 'timeout' });
          if (gameOver) io.to(matchId).emit('game_over', gameOver);
          gameStateManager.cleanup(matchId);
          CLEAR_TURN_TIMER(matchId);
          return;
        }

        // Reschedule next turn timer
        SCHEDULE_TURN_TIMER(matchId, roomId);
      } catch (e) {
        console.error('❌ Turn timer error:', e);
      }
    }, timeoutMs);
    turnTimers.set(matchId, t);
  };
  // Helper: broadcast rooms status to all clients
  const broadcastRoomsStatus = () => {
    const status = roomManager.getAllRoomsStatus();
    io.emit('roomsStatus', status);
  };
  
  /**
   * User enters a room
   * Event: 'enterRoom'
   * Payload: { roomId, userId }
   */
  socket.on('enterRoom', async ({ roomId, userId }) => {
    try {
      console.log(`\n📥 ========== ENTER ROOM ==========`);
      console.log(`   User: ${userId}`);
      console.log(`   Room: ${roomId}`);
      console.log(`   Socket: ${socket.id}`);
      
      // Validate room exists
      if (!roomManager.hasRoom(roomId)) {
        console.log(`   ❌ Room ${roomId} does not exist`);
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
      
      const activeCount = roomManager.getActiveUserCount(roomId);
      const activeList = roomManager.getActiveUsers(roomId);
      console.log(`   ✅ User added to room. Active count: ${activeCount}`);
      console.log(`   👥 Active users now: [${activeList.join(', ')}]`);
      
      // Send confirmation
      socket.emit('roomJoined', {
        roomId,
        userId,
        activeCount
      });
      
      console.log(`   🔔 Scheduling match attempt (debounced 500ms)...`);
      // Broadcast status now
      broadcastRoomsStatus();
      console.log(`===================================\n`);
      
      // Trigger matching with debounce (batches rapid joins)
      matchDebouncer.scheduleMatch(roomId, async () => {
        await matchRoom(roomId, roomManager, io);
        // After matching, broadcast status again (waiting/playing changed)
        broadcastRoomsStatus();
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
  // Broadcast status after leave
  broadcastRoomsStatus();
      
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
      console.log(`\n🎯 ========== SET ACTIVE ==========`);
      console.log(`   User: ${userId}`);
      console.log(`   Room: ${roomId}`);
      console.log(`   Active: ${active}`);
      
      if (!roomManager.hasRoom(roomId)) {
        console.log(`   ❌ Room ${roomId} does not exist`);
        socket.emit('error', { message: `Room ${roomId} does not exist` });
        return;
      }
      
      // Set user active status
      roomManager.setUserActive(roomId, userId, active);
      
      const activeCount = roomManager.getActiveUserCount(roomId);
  const activeList = roomManager.getActiveUsers(roomId);
      console.log(`   ✅ User set to ${active ? 'ACTIVE' : 'INACTIVE'}. Active count: ${activeCount}`);
  console.log(`   👥 Active users now: [${activeList.join(', ')}]`);
      
      // Send confirmation
      socket.emit('activeStatusChanged', { roomId, userId, active });
      
      // Trigger matching if user became active
      if (active) {
        console.log(`   🔔 Scheduling match attempt (debounced 500ms)...`);
        // Broadcast immediate status change
        broadcastRoomsStatus();
        matchDebouncer.scheduleMatch(roomId, async () => {
          await matchRoom(roomId, roomManager, io);
          broadcastRoomsStatus();
        });
      } else {
        // If user became inactive, broadcast status too
        broadcastRoomsStatus();
      }
      
      console.log(`===================================\n`);
      
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
   * Get all rooms status (aggregate)
   * Event: 'getAllRoomsStatus'
   */
  socket.on('getAllRoomsStatus', () => {
    try {
      const status = roomManager.getAllRoomsStatus();
      socket.emit('roomsStatus', status);
    } catch (error) {
      console.error('❌ Error in getAllRoomsStatus:', error);
    }
  });

  /**
   * GAME FLOW EVENTS (match-level)
   */
  // join_match
  socket.on('join_match', ({ matchId, roomId, userId }) => {
    try {
      if (!roomManager.hasRoom(roomId)) {
        socket.emit('match_error', { message: `Room ${roomId} not found`, code: 'ROOM_NOT_FOUND' });
        return;
      }

      const match = roomManager.getMatch(roomId, matchId);
      if (!match) {
        socket.emit('match_error', { message: 'Match not found', code: 'MATCH_NOT_FOUND' });
        return;
      }

      // Validate membership
      if (match.player1 !== userId && match.player2 !== userId) {
        socket.emit('match_error', { message: 'Not authorized for this match', code: 'UNAUTHORIZED' });
        return;
      }

      // Join socket room for this match
      socket.join(matchId);
      socket.data.userId = userId; // ensure we have userId for disconnects
      socket.data.currentMatchId = matchId;

      // Update user socket mapping for safety
      try {
        const room = roomManager.getRoom(roomId);
        room.userSockets.set(userId, socket.id);
      } catch {}

      // Ensure state exists and mark joined
      const state = gameStateManager.ensureState(matchId, roomId, { player1: match.player1, player2: match.player2 });
      gameStateManager.setJoined(matchId, userId);

      // Build safe initial state payload
      const initialState = {
        id: state.id,
        roomId: state.roomId,
        scores: state.scores,
        currentTurn: state.currentTurn,
        startedAt: state.startedAt,
        status: state.status,
      };

      // If both joined → initialize racks/board and game_ready to both, else waiting_opponent to joiner
      if (gameStateManager.bothJoined(matchId)) {
        gameStateManager.initializeIfReady(matchId);
        io.to(matchId).emit('game_ready', {
          matchId,
          roomId,
          players: { player1: match.player1, player2: match.player2 },
          state: initialState,
        });
        // Start turn timer on game start
        SCHEDULE_TURN_TIMER(matchId, roomId);
      } else {
        socket.emit('waiting_opponent', { matchId, roomId });
      }
    } catch (error) {
      console.error('❌ Error in join_match:', error);
      socket.emit('match_error', { message: error.message, code: 'JOIN_FAILED' });
    }
  });

  // place_tiles
  socket.on('place_tiles', async ({ matchId, roomId, userId, move }) => {
    try {
      const match = roomManager.getMatch(roomId, matchId);
      if (!match) {
        socket.emit('match_error', { message: 'Match not found', code: 'MATCH_NOT_FOUND' });
        return;
      }
      if (match.player1 !== userId && match.player2 !== userId) {
        socket.emit('match_error', { message: 'Not authorized', code: 'UNAUTHORIZED' });
        return;
      }
      if (!gameStateManager.validateTurn(matchId, userId)) {
        socket.emit('match_error', { message: 'Not your turn', code: 'INVALID_TURN' });
        return;
      }

      // Sunucu-otorite: client puanını yok say, sözlük doğrulaması yap (varsa)
      const words = Array.isArray(move?.meta?.words) ? move.meta.words.map(w => toUpperCaseTurkish(String(w || ''))) : [];
      if (words.length > 0) {
        const { allValid, details } = await validateWords(words);
        if (!allValid) {
          socket.emit('match_error', { message: 'Geçersiz kelime', code: 'INVALID_WORD', details });
          return;
        }
      }

      let result;
      if (Array.isArray(move?.tiles) && move.tiles.length) {
        // Otoriter hamle: tiles + (opsiyonel) words ve positions beklenir
        const validated = (move?.meta?.validatedWords && Array.isArray(move.meta.validatedWords))
          ? move.meta.validatedWords
          : (words.length ? words.map(w => ({ word: w, positions: move.tiles.map(t => ({ row: t.row, col: t.col })) })) : []);
        result = gameStateManager.applyAuthoritativeMove(matchId, userId, move, validated);
      } else {
        // Geriye dönük: sadece words geldiyse minimal skorla işleme al
        const serverPoints = words.reduce((sum, w) => sum + (w ? w.length : 0), 0);
        const serverMove = {
          ...(move || { type: 'place_tiles', tiles: [] }),
          meta: {
            ...(move?.meta || {}),
            points: serverPoints,
          }
        };
        result = gameStateManager.applyMove(matchId, userId, serverMove);
      }

      const { state, safeMove } = result;

      // Broadcast state patch (boardDiff = placed tiles), plus updated scores
      io.to(matchId).emit('state_patch', {
        matchId,
        move: safeMove,
        boardDiff: Array.isArray(safeMove?.tiles) ? safeMove.tiles.map(t => ({ row: t.row, col: t.col, letter: t.isBlank ? (t.repr || t.letter) : t.letter, isBlank: !!t.isBlank, blankAs: t.isBlank ? (t.repr || t.letter) : null })) : [],
        scores: state.scores,
        currentTurn: state.currentTurn,
        tileBagRemaining: state.tileBag?.remaining?.() ?? undefined,
      });

      // Notify turn change
      io.to(matchId).emit('turn_changed', {
        matchId,
        currentTurn: state.currentTurn,
        reason: 'normal',
      });
      // Reset turn timer
      SCHEDULE_TURN_TIMER(matchId, roomId);
    } catch (error) {
      console.error('❌ Error in place_tiles:', error);
      socket.emit('match_error', { message: error.message, code: 'MOVE_FAILED' });
    }
  });

  // pass_turn
  socket.on('pass_turn', ({ matchId, roomId, userId }) => {
    try {
      const match = roomManager.getMatch(roomId, matchId);
      if (!match) {
        socket.emit('match_error', { message: 'Match not found', code: 'MATCH_NOT_FOUND' });
        return;
      }
      if (match.player1 !== userId && match.player2 !== userId) {
        socket.emit('match_error', { message: 'Not authorized', code: 'UNAUTHORIZED' });
        return;
      }
      if (!gameStateManager.validateTurn(matchId, userId)) {
        socket.emit('match_error', { message: 'Not your turn', code: 'INVALID_TURN' });
        return;
      }

      const state = gameStateManager.passTurn(matchId, userId);
      io.to(matchId).emit('turn_changed', { matchId, currentTurn: state.currentTurn, reason: 'pass' });
      // Reset turn timer
      SCHEDULE_TURN_TIMER(matchId, roomId);
    } catch (error) {
      console.error('❌ Error in pass_turn:', error);
      socket.emit('match_error', { message: error.message, code: 'PASS_FAILED' });
    }
  });

  // leave_match
  socket.on('leave_match', ({ matchId, roomId, userId }) => {
    try {
      const match = roomManager.getMatch(roomId, matchId);
      if (!match) {
        socket.emit('match_error', { message: 'Match not found', code: 'MATCH_NOT_FOUND' });
        return;
      }
      const opponentId = match.player1 === userId ? match.player2 : match.player1;

      io.to(matchId).emit('opponent_left', { matchId, userId });

      const gameOver = gameStateManager.endGame(matchId, { winner: opponentId, reason: 'opponent_disconnected' });
      if (gameOver) {
        io.to(matchId).emit('game_over', gameOver);
      }

      // Cleanup
      gameStateManager.cleanup(matchId);
      roomManager.removeMatch(roomId, matchId);
      socket.leave(matchId);
      socket.data.currentMatchId = null;
      CLEAR_TURN_TIMER(matchId);
      CLEAR_DISCONNECT_TIMER(matchId, userId);
    } catch (error) {
      console.error('❌ Error in leave_match:', error);
      socket.emit('match_error', { message: error.message, code: 'LEAVE_FAILED' });
    }
  });

  // request_full_state (optional sync)
  socket.on('request_full_state', ({ matchId }) => {
    try {
      const state = gameStateManager.getState(matchId);
      if (!state) {
        socket.emit('match_error', { message: 'State not found', code: 'INVALID_STATE' });
        return;
      }
      const me = socket.data.userId;
      const { player1, player2 } = state.players || {};
      const opponent = me === player1 ? player2 : player1;
      const myRack = state.racks?.[me] || [];
      const opponentRackCount = (state.racks?.[opponent] || []).length;
      socket.emit('full_state', {
        id: state.id,
        roomId: state.roomId,
        players: state.players,
        scores: state.scores,
        currentTurn: state.currentTurn,
        moves: state.moves,
        startedAt: state.startedAt,
        lastMoveAt: state.lastMoveAt,
        status: state.status,
        board: state.board,
        rack: { me: myRack, opponentCount: opponentRackCount },
        tileBagRemaining: state.tileBag?.remaining?.() ?? undefined,
      });
    } catch (error) {
      console.error('❌ Error in request_full_state:', error);
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
      const currentMatchId = socket.data.currentMatchId;
      
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

      // If user was in a match, notify opponent and start grace period
      if (currentMatchId) {
        const state = gameStateManager.getState(currentMatchId);
        if (state) {
          const opponentId = state.players.player1 === userId ? state.players.player2 : state.players.player1;
          io.to(currentMatchId).emit('opponent_left', { matchId: currentMatchId, userId });
          gameStateManager.unsetJoined(currentMatchId, userId);

          // Start grace period for reconnection (15s)
          const key = `${currentMatchId}:${userId}`;
          CLEAR_DISCONNECT_TIMER(currentMatchId, userId);
          const t = setTimeout(() => {
            const stillState = gameStateManager.getState(currentMatchId);
            if (stillState && !gameStateManager.bothJoined(currentMatchId)) {
              const gameOver = gameStateManager.endGame(currentMatchId, { winner: opponentId, reason: 'opponent_disconnected' });
              if (gameOver) io.to(currentMatchId).emit('game_over', gameOver);
              gameStateManager.cleanup(currentMatchId);
              CLEAR_TURN_TIMER(currentMatchId);
            }
            CLEAR_DISCONNECT_TIMER(currentMatchId, userId);
          }, 15000);
          disconnectTimers.set(key, t);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in disconnect handler:', error);
    }
  });
}

module.exports = { setupSocketHandlers };
