import { apiClient } from '../utils/apiClient';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://6901e6abb208b24affe42c03.mockapi.io/api';

// Game endpoints
export const GAME_ENDPOINTS = {
  GAMES: '/games',
  GAME_BY_ID: (id) => `/games/${id}`,
};

/**
 * Oyun durumu oluştur
 * @param {Object} gameData - Oyun bilgileri
 * @returns {Promise<Object>} Oluşturulan oyun
 */
export const createGame = async (gameData) => {
  try {
    const response = await apiClient.post(GAME_ENDPOINTS.GAMES, gameData);
    return { success: true, game: response };
  } catch (error) {
    console.error('createGame error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Oyun durumunu getir
 * @param {string} gameId - Oyun ID
 * @returns {Promise<Object>} Oyun durumu
 */
export const fetchGameState = async (gameId) => {
  try {
    const response = await apiClient.get(GAME_ENDPOINTS.GAME_BY_ID(gameId));
    return { success: true, game: response };
  } catch (error) {
    console.error('fetchGameState error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Oyun durumunu güncelle
 * @param {string} gameId - Oyun ID
 * @param {Object} updates - Güncellenecek veriler
 * @returns {Promise<Object>} Güncellenmiş oyun
 */
export const updateGameState = async (gameId, updates) => {
  try {
    const response = await apiClient.put(GAME_ENDPOINTS.GAME_BY_ID(gameId), updates);
    return { success: true, game: response };
  } catch (error) {
    console.error('updateGameState error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Hamle kaydet
 * @param {string} gameId - Oyun ID
 * @param {Object} move - Hamle bilgisi
 * @returns {Promise<Object>} Güncellenmiş oyun
 */
export const submitMove = async (gameId, move) => {
  try {
    // Önce mevcut oyunu al
    const { success, game } = await fetchGameState(gameId);
    if (!success) throw new Error('Oyun bulunamadı');

    // Hamle geçmişine ekle
    const updatedMoveHistory = [...(game.moveHistory || []), move];
    
    // Oyun durumunu güncelle
    const updates = {
      ...game,
      moveHistory: updatedMoveHistory,
      currentTurn: game.currentTurn === 'player1' ? 'player2' : 'player1',
      gameBoard: move.gameBoard,
      scores: move.scores,
      lastMoveAt: new Date().toISOString(),
      version: (game.version || 0) + 1, // Optimistic locking için
    };

    return await updateGameState(gameId, updates);
  } catch (error) {
    console.error('submitMove error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Oyunu bitir
 * @param {string} gameId - Oyun ID
 * @param {Object} endData - Bitiş bilgileri
 * @returns {Promise<Object>} Güncellenmiş oyun
 */
export const endGame = async (gameId, endData) => {
  try {
    const { success, game } = await fetchGameState(gameId);
    if (!success) throw new Error('Oyun bulunamadı');

    const updates = {
      ...game,
      status: 'finished',
      winner: endData.winner,
      finalScores: endData.scores,
      endReason: endData.reason,
      endedAt: new Date().toISOString(),
    };

    return await updateGameState(gameId, updates);
  } catch (error) {
    console.error('endGame error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Pas geç
 * @param {string} gameId - Oyun ID
 * @param {string} playerId - Pas geçen oyuncu
 * @returns {Promise<Object>} Güncellenmiş oyun
 */
export const passMove = async (gameId, playerId) => {
  try {
    const { success, game } = await fetchGameState(gameId);
    if (!success) throw new Error('Oyun bulunamadı');

    const playerKey = game.player1Id === playerId ? 'player1PassCount' : 'player2PassCount';
    
    const passMove = {
      type: 'pass',
      playerId,
      timestamp: new Date().toISOString(),
    };

    const updates = {
      ...game,
      moveHistory: [...(game.moveHistory || []), passMove],
      [playerKey]: (game[playerKey] || 0) + 1,
      currentTurn: game.currentTurn === 'player1' ? 'player2' : 'player1',
      lastMoveAt: new Date().toISOString(),
      version: (game.version || 0) + 1,
    };

    return await updateGameState(gameId, updates);
  } catch (error) {
    console.error('passMove error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Oyuncu hazır durumunu güncelle
 * @param {string} gameId - Oyun ID
 * @param {string} playerId - Hazır olan oyuncu
 * @returns {Promise<Object>} Güncellenmiş oyun
 */
export const setPlayerReady = async (gameId, playerId) => {
  try {
    const { success, game } = await fetchGameState(gameId);
    if (!success) throw new Error('Oyun bulunamadı');

    const playerKey = game.player1Id === playerId ? 'player1Ready' : 'player2Ready';
    
    const updates = {
      ...game,
      [playerKey]: true,
      version: (game.version || 0) + 1,
    };

    // Her iki oyuncu da hazırsa countdown başlat
    const bothReady = (playerKey === 'player1Ready' && game.player2Ready) || 
                      (playerKey === 'player2Ready' && game.player1Ready);
    
    if (bothReady) {
      updates.countdownStartedAt = new Date().toISOString();
      updates.status = 'countdown'; // waiting -> countdown -> active
    }

    return await updateGameState(gameId, updates);
  } catch (error) {
    console.error('setPlayerReady error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Oyunu başlat (countdown bittiğinde)
 * @param {string} gameId - Oyun ID
 * @returns {Promise<Object>} Güncellenmiş oyun
 */
export const startGameCountdown = async (gameId) => {
  try {
    const { success, game } = await fetchGameState(gameId);
    if (!success) throw new Error('Oyun bulunamadı');

    const updates = {
      ...game,
      status: 'active',
      startedAt: new Date().toISOString(),
      version: (game.version || 0) + 1,
    };

    return await updateGameState(gameId, updates);
  } catch (error) {
    console.error('startGameCountdown error:', error);
    return { success: false, error: error.message };
  }
};
