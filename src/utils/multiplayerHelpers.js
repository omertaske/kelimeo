import { 
  createGame, 
  submitMove, 
  passMove as passMoveAPI,
  setPlayerReady as setPlayerReadyAPI 
} from '../services/gameService';
import { createGameState, getPlayerRole, PLAYER_ROLES } from '../services/gameStateHelper';

/**
 * Multiplayer oyun başlatma yardımcısı
 */
export const initializeMultiplayerGame = async ({
  gameId,
  player1Id,
  player2Id,
  boardId,
  currentUserId,
}) => {
  try {
    // Oyun durumu oluştur
    const gameState = createGameState({
      gameId,
      player1Id,
      player2Id,
      boardId,
    });

    // API'ye kaydet
    const { success, game, error } = await createGame(gameState);

    if (!success) {
      console.error('Oyun olusturulamadi:', error);
      return { success: false, error };
    }

    // Oyuncu rolünü belirle
    const myRole = getPlayerRole(game, currentUserId);

    console.log('Multiplayer oyun olusturuldu:', {
      gameId: game.id,
      myRole,
      currentTurn: game.currentTurn,
    });

    return {
      success: true,
      game,
      myRole,
      isMyTurn: game.currentTurn === myRole,
    };
  } catch (error) {
    console.error('initializeMultiplayerGame hatasi:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Multiplayer hamle gönderme
 */
export const sendMultiplayerMove = async ({
  gameId,
  playerId,
  word,
  positions,
  gameBoard,
  scores,
  formedWords,
}) => {
  try {
    const move = {
      type: 'move',
      playerId,
      word,
      positions,
      gameBoard,
      scores,
      formedWords,
      timestamp: new Date().toISOString(),
    };

    const { success, game, error } = await submitMove(gameId, move);

    if (!success) {
      console.error('Hamle gonderilemedi:', error);
      return { success: false, error };
    }

    console.log('Hamle APIye kaydedildi:', {
      word,
      newTurn: game.currentTurn,
    });

    return { success: true, game };
  } catch (error) {
    console.error('sendMultiplayerMove hatasi:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Multiplayer pas gönderme
 */
export const sendMultiplayerPass = async ({
  gameId,
  playerId,
}) => {
  try {
    const { success, game, error } = await passMoveAPI(gameId, playerId);

    if (!success) {
      console.error('Pas gonderilemedi:', error);
      return { success: false, error };
    }

    console.log('Pas APIye kaydedildi');

    return { success: true, game };
  } catch (error) {
    console.error('sendMultiplayerPass hatasi:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Server'dan gelen oyun durumunu local state'e uygula
 */
export const applyServerGameState = (serverGame, setters) => {
  const {
    setGameBoard,
    setScore,
    setCurrentTurn,
    setMoveHistory,
    setPlayerPassCount,
    setOpponentPassCount,
    setGameTimer,
    setTurnTimer,
    playerPassCountRef,
    opponentPassCountRef,
    myRole,
  } = setters;

  try {
    // Tahta durumunu güncelle
    if (serverGame.gameBoard) {
      setGameBoard(serverGame.gameBoard);
    }

    // Skorları güncelle
    if (serverGame.scores) {
      // Rollere göre skorları eşleştir
      const myScore = myRole === PLAYER_ROLES.PLAYER1 
        ? serverGame.scores.player1 
        : serverGame.scores.player2;
      const opponentScore = myRole === PLAYER_ROLES.PLAYER1 
        ? serverGame.scores.player2 
        : serverGame.scores.player1;

      setScore({ player: myScore, opponent: opponentScore });
    }

    // Sıra durumunu güncelle
    if (serverGame.currentTurn) {
      // Server'daki 'player1'/'player2' -> 'player'/'opponent' dönüşümü
      const localTurn = serverGame.currentTurn === myRole ? 'player' : 'opponent';
      setCurrentTurn(localTurn);
    }

    // Hamle geçmişini güncelle
    if (serverGame.moveHistory) {
      setMoveHistory(serverGame.moveHistory);
    }

    // Pas sayaçlarını güncelle
    if (myRole === PLAYER_ROLES.PLAYER1) {
      setPlayerPassCount(serverGame.player1PassCount || 0);
      setOpponentPassCount(serverGame.player2PassCount || 0);
      playerPassCountRef.current = serverGame.player1PassCount || 0;
      opponentPassCountRef.current = serverGame.player2PassCount || 0;
    } else {
      setPlayerPassCount(serverGame.player2PassCount || 0);
      setOpponentPassCount(serverGame.player1PassCount || 0);
      playerPassCountRef.current = serverGame.player2PassCount || 0;
      opponentPassCountRef.current = serverGame.player1PassCount || 0;
    }

    // Timer'ları güncelle
    if (serverGame.gameTimer !== undefined) {
      setGameTimer(serverGame.gameTimer);
    }
    if (serverGame.turnTimer !== undefined) {
      setTurnTimer(serverGame.turnTimer);
    }

    console.log('Server state uygulandi:', {
      currentTurn: serverGame.currentTurn,
      myRole,
      localTurn: serverGame.currentTurn === myRole ? 'player' : 'opponent',
    });

    return { success: true };
  } catch (error) {
    console.error('applyServerGameState hatasi:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Oyuncunun hazır olduğunu bildir
 */
export const markPlayerReady = async ({ gameId, playerId }) => {
  try {
    const { success, game, error } = await setPlayerReadyAPI(gameId, playerId);

    if (!success) {
      console.error('Hazir durumu guncellenemedi:', error);
      return { success: false, error };
    }

    console.log('Oyuncu hazir olarak isaretle:', {
      gameId,
      playerId,
      player1Ready: game.player1Ready,
      player2Ready: game.player2Ready,
      status: game.status,
    });

    return { success: true, game };
  } catch (error) {
    console.error('markPlayerReady hatasi:', error);
    return { success: false, error: error.message };
  }
};
