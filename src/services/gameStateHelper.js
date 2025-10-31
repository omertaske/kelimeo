/**
 * Oyun durumu tipleri ve yardımcı fonksiyonlar
 */

export const GAME_STATUS = {
  WAITING: 'waiting',      // Oyuncular hazırlanıyor
  COUNTDOWN: 'countdown',  // Geri sayım başladı
  ACTIVE: 'active',        // Oyun aktif
  FINISHED: 'finished',    // Oyun bitti
  ABANDONED: 'abandoned',  // Oyun terk edildi
};

export const PLAYER_ROLES = {
  PLAYER1: 'player1',
  PLAYER2: 'player2',
};

/**
 * Yeni oyun durumu oluştur
 */
export const createGameState = ({
  gameId,
  player1Id,
  player2Id,
  boardId,
  boardSize = 15,
  timeLimit = 300,
}) => {
  const now = new Date().toISOString();
  
  return {
    id: gameId,
    player1Id,
    player2Id,
    boardId,
    status: GAME_STATUS.WAITING, // Oyun başlangıçta waiting durumunda
    player1Ready: false, // Player 1 hazır mı?
    player2Ready: false, // Player 2 hazır mı?
    countdownStartedAt: null, // Countdown başlangıç zamanı
    currentTurn: Math.random() > 0.5 ? PLAYER_ROLES.PLAYER1 : PLAYER_ROLES.PLAYER2,
    gameBoard: createEmptyBoard(boardSize),
    scores: {
      player1: 0,
      player2: 0,
    },
    player1PassCount: 0,
    player2PassCount: 0,
    moveHistory: [],
    gameTimer: timeLimit,
    turnTimer: 60,
    tileBag: null, // Tile bag durumu
    createdAt: now,
    startedAt: null, // Oyun başlamadı henüz
    lastMoveAt: now,
    endedAt: null,
    winner: null,
    endReason: null,
    version: 0,
  };
};

/**
 * Boş tahta oluştur
 */
export const createEmptyBoard = (size = 15) => {
  return Array(size).fill(null).map(() => 
    Array(size).fill(null).map(() => ({
      letter: null,
      multiplier: null,
      isCenter: false,
      owner: null,
    }))
  );
};

/**
 * Oyuncu rolünü belirle (player1 veya player2)
 */
export const getPlayerRole = (gameState, userId) => {
  if (!gameState || !userId) return null;
  if (gameState.player1Id === userId) return PLAYER_ROLES.PLAYER1;
  if (gameState.player2Id === userId) return PLAYER_ROLES.PLAYER2;
  return null;
};

/**
 * Rakip rolünü al
 */
export const getOpponentRole = (playerRole) => {
  return playerRole === PLAYER_ROLES.PLAYER1 
    ? PLAYER_ROLES.PLAYER2 
    : PLAYER_ROLES.PLAYER1;
};

/**
 * Sıra bende mi kontrol et
 */
export const isMyTurn = (gameState, userId) => {
  const role = getPlayerRole(gameState, userId);
  return role && gameState.currentTurn === role;
};

/**
 * Oyun bitti mi kontrol et
 */
export const isGameFinished = (gameState) => {
  return gameState?.status === GAME_STATUS.FINISHED ||
         gameState?.status === GAME_STATUS.ABANDONED;
};

/**
 * 4 pas kontrolü (her oyuncu 4 kez pas geçerse)
 */
export const checkPassLimit = (gameState) => {
  return (gameState?.player1PassCount >= 4) || (gameState?.player2PassCount >= 4);
};

/**
 * Kazananı belirle
 */
export const determineWinner = (gameState) => {
  if (!gameState) return null;
  
  const { scores, player1PassCount, player2PassCount } = gameState;
  
  // 4 pas kuralı kontrolü
  if (player1PassCount >= 4) return PLAYER_ROLES.PLAYER2;
  if (player2PassCount >= 4) return PLAYER_ROLES.PLAYER1;
  
  // Puan farkı
  if (scores.player1 > scores.player2) return PLAYER_ROLES.PLAYER1;
  if (scores.player2 > scores.player1) return PLAYER_ROLES.PLAYER2;
  
  return 'draw'; // Berabere
};
