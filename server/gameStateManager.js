// GAME-LEVEL STATE — eşleşme sonrası oyun akışı burada yönetilir

const { v4: uuidv4 } = require('uuid');

class GameStateManager {
  constructor() {
    // matchId -> state
    this.gameStates = new Map();
  }

  ensureState(matchId, roomId, players) {
    if (!this.gameStates.has(matchId)) {
      const startedAt = new Date().toISOString();
      const state = {
        id: matchId,
        roomId,
        players: { player1: players.player1, player2: players.player2 },
        scores: { [players.player1]: 0, [players.player2]: 0 },
        currentTurn: players.player1,
        moves: [],
        startedAt,
        lastMoveAt: startedAt,
        status: 'waiting',
        joined: new Set(), // userIds who joined the match room
        processedMoveIds: new Set(), // idempotency guard
        timeoutCounts: {}, // userId -> number of timeouts
      };
      this.gameStates.set(matchId, state);
    }
    return this.gameStates.get(matchId);
  }

  getState(matchId) {
    return this.gameStates.get(matchId) || null;
  }

  setJoined(matchId, userId) {
    const state = this.getState(matchId);
    if (!state) return;
    state.joined.add(userId);
  }

  unsetJoined(matchId, userId) {
    const state = this.getState(matchId);
    if (!state) return;
    state.joined.delete(userId);
  }

  bothJoined(matchId) {
    const state = this.getState(matchId);
    if (!state) return false;
    const { player1, player2 } = state.players;
    return state.joined.has(player1) && state.joined.has(player2);
  }

  validateTurn(matchId, userId) {
    const state = this.getState(matchId);
    if (!state) return false;
    return state.currentTurn === userId;
  }

  applyMove(matchId, userId, move) {
    const state = this.getState(matchId);
    if (!state) throw new Error('INVALID_STATE');

    // Minimal move application; scoring is optional
    const ts = new Date().toISOString();
    const moveId = move?.meta?.moveId || uuidv4();
    // Idempotency: skip duplicate moves
    if (state.processedMoveIds.has(moveId)) {
      return { state, safeMove: { ...move, meta: { ...(move?.meta || {}), moveId, ts, duplicate: true } } };
    }
    state.processedMoveIds.add(moveId);

    const safeMove = { id: moveId, by: userId, ...move, meta: { ...(move?.meta || {}), moveId, ts } };
    state.moves.push(safeMove);

    // Optional scoring if provided
    if (typeof move?.meta?.points === 'number') {
      state.scores[userId] = (state.scores[userId] || 0) + move.meta.points;
    }

    state.lastMoveAt = ts;

    // Switch turn
    const { player1, player2 } = state.players;
    state.currentTurn = userId === player1 ? player2 : player1;

    // Mark as playing if was waiting
    if (state.status === 'waiting') state.status = 'playing';

    return { state, safeMove };
  }

  passTurn(matchId, userId) {
    const state = this.getState(matchId);
    if (!state) throw new Error('INVALID_STATE');
    const { player1, player2 } = state.players;
    state.currentTurn = userId === player1 ? player2 : player1;
    state.lastMoveAt = new Date().toISOString();
    return state;
  }

  endGame(matchId, payload = {}) {
    const state = this.getState(matchId);
    if (!state) return null;
    state.status = 'finished';
    const result = {
      matchId,
      winner: payload.winner ?? null,
      reason: payload.reason || 'exhausted',
      finalState: {
        id: state.id,
        roomId: state.roomId,
        players: state.players,
        scores: state.scores,
        moves: state.moves,
        startedAt: state.startedAt,
        lastMoveAt: state.lastMoveAt,
        status: state.status,
      }
    };
    return result;
  }

  cleanup(matchId) {
    this.gameStates.delete(matchId);
  }
}

module.exports = { GameStateManager };
