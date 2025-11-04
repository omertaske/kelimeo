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
  const { LETTER_SCORES, LETTER_DISTRIBUTION } = require('./constants/board');
  const { validateWords } = require('./services/dictionaryService');
  const { toUpperCaseTurkish } = require('./utils/stringUtils');
  // Timers
  const turnTimers = new Map(); // matchId -> timeoutId
  const turnExpiry = new Map(); // matchId -> epoch ms
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
    const expiresAt = Date.now() + timeoutMs;
    turnExpiry.set(matchId, expiresAt);
    const t = setTimeout(() => {
      try {
        const state = gameStateManager.getState(matchId);
        if (!state || state.status !== 'playing') return;
        const offenderId = state.currentTurn;
        const nextState = gameStateManager.passTurn(matchId, offenderId);
        // Track timeouts per user (simple end condition)
        nextState.timeoutCounts[offenderId] = (nextState.timeoutCounts[offenderId] || 0) + 1;

        const nextExpiresAt = Date.now() + timeoutMs;
        turnExpiry.set(matchId, nextExpiresAt);
        io.to(matchId).emit('turn_changed', { matchId, currentTurn: nextState.currentTurn, reason: 'timeout', turn_expires_at: nextExpiresAt });

        // If user timed out twice → opponent wins
        if (nextState.timeoutCounts[offenderId] >= 2) {
          const opponentId = nextState.players.player1 === offenderId ? nextState.players.player2 : nextState.players.player1;
          const gameOver = gameStateManager.endGame(matchId, { winner: opponentId, reason: 'timeout' });
          if (gameOver) io.to(matchId).emit('game_over', gameOver);
          gameStateManager.cleanup(matchId);
          // Remove stale match mapping to prevent accidental state re-bootstrap
          try { roomManager.removeMatch(roomId, matchId); } catch {}
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
    return expiresAt;
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

  // If there was a pending disconnect grace timer for this user, cancel it (user has rejoined)
  try { CLEAR_DISCONNECT_TIMER(matchId, userId); } catch {}

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
        const expiresAt = SCHEDULE_TURN_TIMER(matchId, roomId);
        // Both are back in; ensure any pending disconnect timers for either player are cleared
        try { CLEAR_DISCONNECT_TIMER(matchId, match.player1); } catch {}
        try { CLEAR_DISCONNECT_TIMER(matchId, match.player2); } catch {}
        const st = gameStateManager.getState(matchId);
        io.to(matchId).emit('game_ready', {
          matchId,
          roomId,
          players: { player1: match.player1, player2: match.player2 },
          state: initialState,
          turn_expires_at: expiresAt,
          tileBagRemaining: st?.tileBag?.remaining?.() ?? undefined,
          tilebag_info: { letterScores: LETTER_SCORES, distribution: LETTER_DISTRIBUTION },
        });
        // Timer başlatıldı
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
      const actorId = userId || socket.data.userId;
      // Require existing game state; if missing, do not bootstrap here to avoid accidental resets
      const existingState = gameStateManager.getState(matchId);
      if (!existingState) {
        socket.emit('match_error', { message: 'State not found', code: 'INVALID_STATE' });
        return;
      }
      // Early idempotency check: if same moveId already processed, echo duplicate without re-applying
      try {
        const st = existingState;
        const mid = move?.meta?.moveId;
        if (st && mid && st.processedMoveIds && st.processedMoveIds.has(mid)) {
          const dupExpiry = turnExpiry.get(matchId) || null;
          const rackCountsDup = {
            [st.players.player1]: (st.racks?.[st.players.player1] || []).length,
            [st.players.player2]: (st.racks?.[st.players.player2] || []).length,
          };
          io.to(matchId).emit('state_patch', {
            matchId,
            move: { ...(move || {}), meta: { ...(move?.meta || {}), duplicate: true } },
            boardDiff: [],
            scores: st.scores,
            currentTurn: st.currentTurn,
            tileBagRemaining: st.tileBag?.remaining?.() ?? undefined,
            rackCounts: rackCountsDup,
            turn_expires_at: dupExpiry,
          });
          return;
        }
      } catch {}

      const match = roomManager.getMatch(roomId, matchId);
      if (!match) {
        socket.emit('match_error', { message: 'Match not found', code: 'MATCH_NOT_FOUND' });
        return;
      }
      if (match.player1 !== actorId && match.player2 !== actorId) {
        socket.emit('match_error', { message: 'Not authorized', code: 'UNAUTHORIZED' });
        return;
      }
      if (!gameStateManager.validateTurn(matchId, actorId)) {
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
        try {
          result = gameStateManager.applyAuthoritativeMove(matchId, actorId, move, validated);
        } catch (e) {
          if (e && (e.code === 'INVALID_MOVE' || e.message === 'INVALID_MOVE')) {
            socket.emit('match_error', { message: 'Geçersiz hamle', code: 'INVALID_MOVE' });
            return;
          }
          if (e && (e.code === 'INVALID_STATE' || e.message === 'INVALID_STATE')) {
            socket.emit('match_error', { message: 'State not found', code: 'INVALID_STATE' });
            return;
          }
          throw e;
        }
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
        try {
          result = gameStateManager.applyMove(matchId, actorId, serverMove);
        } catch (e) {
          if (e && (e.code === 'INVALID_STATE' || e.message === 'INVALID_STATE')) {
            socket.emit('match_error', { message: 'State not found', code: 'INVALID_STATE' });
            return;
          }
          throw e;
        }
      }

      const { state, safeMove } = result;

      // Schedule next turn timer first so clients receive the accurate expiry
      const nextExpiresAt = SCHEDULE_TURN_TIMER(matchId, roomId);

      // Rack counts for lightweight sync (no full racks leaked)
      const rackCounts = {
        [state.players.player1]: (state.racks?.[state.players.player1] || []).length,
        [state.players.player2]: (state.racks?.[state.players.player2] || []).length,
      };

      // Broadcast state patch (boardDiff = placed tiles), plus updated scores and rack counts
      io.to(matchId).emit('state_patch', {
        matchId,
        move: safeMove,
        boardDiff: Array.isArray(safeMove?.tiles) ? safeMove.tiles.map(t => ({ row: t.row, col: t.col, letter: t.isBlank ? (t.repr || t.letter) : t.letter, isBlank: !!t.isBlank, blankAs: t.isBlank ? (t.repr || t.letter) : null })) : [],
        scores: state.scores,
        currentTurn: state.currentTurn,
        tileBagRemaining: state.tileBag?.remaining?.() ?? undefined,
        rackCounts,
        turn_expires_at: nextExpiresAt,
      });

      // Send the actor's full rack privately to their socket so their UI can update without leaking racks
      try {
        const ackActorId = safeMove?.by;
        const actorSocketId = roomManager.getUserSocket(roomId, ackActorId);
        if (actorSocketId) {
          io.to(actorSocketId).emit('your_rack', { matchId, rack: state.racks?.[ackActorId] || [] });
        }
      } catch (e) {
        // non-fatal
      }

      // Notify turn change
      io.to(matchId).emit('turn_changed', {
        matchId,
        currentTurn: state.currentTurn,
        reason: 'normal',
        turn_expires_at: nextExpiresAt,
      });
      // Reset turn timer already scheduled
    } catch (error) {
      console.error('❌ Error in place_tiles:', error);
      socket.emit('match_error', { message: error.message, code: 'MOVE_FAILED' });
    }
  });

  // pass_turn
  socket.on('pass_turn', ({ matchId, roomId, userId }) => {
    try {
      const actorId = userId || socket.data.userId;
      const existingState = gameStateManager.getState(matchId);
      if (!existingState) {
        socket.emit('match_error', { message: 'State not found', code: 'INVALID_STATE' });
        return;
      }
      const match = roomManager.getMatch(roomId, matchId);
      if (!match) {
        socket.emit('match_error', { message: 'Match not found', code: 'MATCH_NOT_FOUND' });
        return;
      }
      if (match.player1 !== actorId && match.player2 !== actorId) {
        socket.emit('match_error', { message: 'Not authorized', code: 'UNAUTHORIZED' });
        return;
      }
      if (!gameStateManager.validateTurn(matchId, actorId)) {
        socket.emit('match_error', { message: 'Not your turn', code: 'INVALID_TURN' });
        return;
      }

      const state = gameStateManager.passTurn(matchId, actorId);
      // Schedule timer first
      const nextExpiresAt = SCHEDULE_TURN_TIMER(matchId, roomId);

      // Broadcast lightweight state_patch so clients can sync turn/score/tilebag/rackcounts
      const rackCounts = {
        [state.players.player1]: (state.racks?.[state.players.player1] || []).length,
        [state.players.player2]: (state.racks?.[state.players.player2] || []).length,
      };

      io.to(matchId).emit('state_patch', {
        matchId,
        move: { type: 'pass', by: userId, meta: { reason: 'pass' } },
        boardDiff: [],
        scores: state.scores,
        currentTurn: state.currentTurn,
        tileBagRemaining: state.tileBag?.remaining?.() ?? undefined,
        rackCounts,
        turn_expires_at: nextExpiresAt,
      });

      io.to(matchId).emit('turn_changed', { matchId, currentTurn: state.currentTurn, reason: 'pass', turn_expires_at: nextExpiresAt });
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
  socket.on('request_full_state', ({ matchId, roomId, userId }) => {
    try {
      let state = gameStateManager.getState(matchId);

      if (!state) {
        socket.emit('match_error', { message: 'State not found', code: 'INVALID_STATE' });
        return;
      }

      const me = socket.data.userId || userId;
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
        tilebag_info: { letterScores: LETTER_SCORES, distribution: LETTER_DISTRIBUTION },
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
        // If user is already in an active match, DO NOT cancel the match here.
        // Let the match-level grace period logic below handle potential game_over after timeout.
        let hasActiveMatch = false;
        try {
          const room = roomManager.getRoom(currentRoom);
          if (room && room.matches && room.matches.size > 0) {
            for (const [, m] of room.matches) {
              if (m && (m.player1 === userId || m.player2 === userId)) { hasActiveMatch = true; break; }
            }
          }
        } catch {}

        if (!currentMatchId && !hasActiveMatch) {
          // Cancel pending matchmaking pairings only when not in an active match
          const cancelledMatches = roomManager.cancelMatchesForUser(currentRoom, userId);
          
          // Notify partners of cancelled pending matches
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
        }
        
        // Remove user from room users list regardless
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
              // capture roomId before cleanup to remove match mapping as well
              const rmId = stillState.roomId;
              gameStateManager.cleanup(currentMatchId);
              try { if (rmId) roomManager.removeMatch(rmId, currentMatchId); } catch {}
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
