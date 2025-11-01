// GAME-LEVEL STATE — eşleşme sonrası oyun akışı burada yönetilir

const { v4: uuidv4 } = require('uuid');
const { BOARD_SIZE, PREMIUM_POSITIONS, LETTER_SCORES } = require('./constants/board');
const { TileBag } = require('./utils/tileBag');
const { toUpperCaseTurkish } = require('./utils/stringUtils');

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
        // Authoritative state
        board: this._createBoard(),
        tileBag: new TileBag(),
        racks: { [players.player1]: [], [players.player2]: [] },
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

  initializeIfReady(matchId) {
    const state = this.getState(matchId);
    if (!state) return;
    if (state.status !== 'waiting') return;
    if (!this.bothJoined(matchId)) return;
    // Fill racks (7 tiles each)
    const { player1, player2 } = state.players;
    state.racks[player1] = state.tileBag.draw(7).map(t => t.letter);
    state.racks[player2] = state.tileBag.draw(7).map(t => t.letter);
    state.status = 'playing';
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

  // Create empty board with multipliers
  _createBoard() {
    const size = BOARD_SIZE;
    const board = Array.from({ length: size }, () => Array.from({ length: size }, () => ({
      letter: null,
      isBlank: false,
      blankAs: null,
      multiplier: null,
      usedMultipliers: false,
      isCenter: false,
      owner: null,
      value: 0,
    })));
    const center = Math.floor(size / 2);
    if (board[center] && board[center][center]) board[center][center].isCenter = true;
    for (const [type, positions] of Object.entries(PREMIUM_POSITIONS)) {
      positions.forEach(([r, c]) => {
        if (r < size && c < size && board[r] && board[r][c]) board[r][c].multiplier = type;
      });
    }
    return board;
  }

  // Authoritative scoring with multipliers
  _calculateScore(word, positions, board) {
    let base = 0;
    let wordMul = 1;
    positions.forEach((pos, idx) => {
      const letter = word[idx];
      const cell = board[pos.row]?.[pos.col] || {};
      const letterScore = LETTER_SCORES[letter] ?? 0;
      let letterMul = 1;
      if (cell.multiplier && !cell.usedMultipliers) {
        if (cell.multiplier === 'TL') letterMul = 3;
        if (cell.multiplier === 'DL') letterMul = 2;
        if (cell.multiplier === 'TW') wordMul *= 3;
        if (cell.multiplier === 'DW') wordMul *= 2;
      }
      base += letterScore * letterMul;
    });
    return base * wordMul;
  }

  // Apply authoritative move if tiles provided (positions + letters)
  applyAuthoritativeMove(matchId, userId, move, validatedWords) {
    const state = this.getState(matchId);
    if (!state) throw new Error('INVALID_STATE');
    const ts = new Date().toISOString();
    const moveId = move?.meta?.moveId || uuidv4();
    if (state.processedMoveIds.has(moveId)) {
      return { state, safeMove: { ...move, meta: { ...(move?.meta || {}), moveId, ts, duplicate: true } } };
    }

    const tiles = Array.isArray(move?.tiles) ? move.tiles : [];
    // Place tiles
    tiles.forEach(({ row, col, letter, isBlank, repr }) => {
      const cell = state.board[row]?.[col];
      if (!cell) return;
      const finalLetter = isBlank ? (repr || letter) : letter;
      const hadMult = !!cell.multiplier;
      state.board[row][col] = {
        ...cell,
        letter: finalLetter,
        isBlank: !!isBlank,
        blankAs: isBlank ? (repr || finalLetter) : null,
        owner: userId,
        value: LETTER_SCORES[finalLetter] ?? 0,
        usedMultipliers: cell.usedMultipliers || hadMult ? true : false,
      };
    });

    // Score based on validatedWords (array of { word, positions })
    let points = 0;
    if (Array.isArray(validatedWords) && validatedWords.length) {
      validatedWords.forEach(({ word, positions }) => {
        const normWord = toUpperCaseTurkish(word);
        points += this._calculateScore(normWord, positions, state.board);
      });
    }

    // Update racks: remove used letters; draw new ones
    const usedCount = tiles.length;
    if (usedCount > 0) {
      const rack = state.racks[userId] || [];
      tiles.forEach(({ letter, isBlank, repr }) => {
        const target = isBlank ? '*' : (letter);
        const idx = rack.indexOf(target);
        if (idx > -1) rack.splice(idx, 1);
      });
      const drawn = state.tileBag.draw(Math.max(0, 7 - rack.length)).map(t => t.letter);
      state.racks[userId] = rack.concat(drawn);
    }

    const safeMove = { id: moveId, by: userId, type: 'place_tiles', tiles, meta: { ...(move?.meta || {}), moveId, ts, points } };
    state.moves.push(safeMove);
    state.scores[userId] = (state.scores[userId] || 0) + points;
    state.lastMoveAt = ts;

    // Switch turn
    const { player1, player2 } = state.players;
    state.currentTurn = userId === player1 ? player2 : player1;
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
