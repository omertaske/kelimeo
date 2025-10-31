import { apiClient } from '../utils/apiClient';
import { createGameState, GAME_STATUS } from './gameStateHelper';

/**
 * Matchmaking servisi
 * Oyuncuları eşleştirmek için kullanılır
 */

/**
 * Bekleyen oyun ara
 * @param {string} boardId - Tahta ID
 * @returns {Promise<Object>} Bekleyen oyun veya null
 */
export const findWaitingGame = async (boardId) => {
  try {
    // Tüm oyunları çek
    const games = await apiClient.get('/games');
    
    if (!games || games.length === 0) {
      return { success: true, game: null };
    }

    // Bekleyen oyunları filtrele
    const waitingGames = games.filter(game => 
      game.status === GAME_STATUS.WAITING &&
      game.boardId === boardId &&
      !game.player2Id // İkinci oyuncu henüz katılmamış
    );

    if (waitingGames.length === 0) {
      return { success: true, game: null };
    }

    // En son oluşturulan bekleyen oyunu döndür
    const latestGame = waitingGames.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    return { success: true, game: latestGame };
  } catch (error) {
    console.error('findWaitingGame error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bekleyen oyuna katıl
 * @param {string} gameId - Oyun ID
 * @param {string} player2Id - Katılacak oyuncu ID
 * @returns {Promise<Object>} Güncellenmiş oyun
 */
export const joinWaitingGame = async (gameId, player2Id) => {
  try {
    // Oyunu çek
    const game = await apiClient.get(`/games/${gameId}`);
    
    if (!game) {
      throw new Error('Oyun bulunamadı');
    }

    if (game.player2Id) {
      throw new Error('Bu oyun dolu');
    }

    // İkinci oyuncuyu ekle
    const updates = {
      ...game,
      player2Id,
      version: (game.version || 0) + 1,
    };

    const updatedGame = await apiClient.put(`/games/${gameId}`, updates);
    
    console.log('Bekleyen oyuna katildi:', {
      gameId,
      player1: game.player1Id,
      player2: player2Id,
    });

    return { success: true, game: updatedGame };
  } catch (error) {
    console.error('joinWaitingGame error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Yeni oyun oluştur veya bekleyen oyuna katıl
 * @param {Object} params - Parametreler
 * @returns {Promise<Object>} Oyun ve rol bilgisi
 */
export const findOrCreateGame = async ({ userId, boardId }) => {
  try {
    // Önce bekleyen oyun ara
    const { success: findSuccess, game: waitingGame } = await findWaitingGame(boardId);

    if (!findSuccess) {
      throw new Error('Bekleyen oyun aranamadı');
    }

    // Eğer bekleyen oyun varsa ona katıl
    if (waitingGame) {
      // Kendi oluşturduğun oyuna katılmaya çalışma
      if (waitingGame.player1Id === userId) {
        console.log('Kendi oyunun zaten var, bekleniyor...');
        return {
          success: true,
          game: waitingGame,
          role: 'player1',
          isWaiting: true,
        };
      }

      // Başka birinin oyununa katıl
      const { success: joinSuccess, game: joinedGame } = await joinWaitingGame(
        waitingGame.id,
        userId
      );

      if (!joinSuccess) {
        throw new Error('Oyuna katılamadı');
      }

      console.log('Mevcut oyuna katildi');
      return {
        success: true,
        game: joinedGame,
        role: 'player2',
        isWaiting: false,
      };
    }

    // Bekleyen oyun yoksa yeni oyun oluştur
    const gameId = `game_${Date.now()}_${userId}`;
    const newGameState = createGameState({
      gameId,
      player1Id: userId,
      player2Id: null, // Henüz ikinci oyuncu yok
      boardId,
    });

    const newGame = await apiClient.post('/games', newGameState);

    console.log('Yeni oyun olusturuldu, rakip bekleniyor...');
    return {
      success: true,
      game: newGame,
      role: 'player1',
      isWaiting: true,
    };
  } catch (error) {
    console.error('findOrCreateGame error:', error);
    return { success: false, error: error.message };
  }
};
