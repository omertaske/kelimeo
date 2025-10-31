import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchGameState } from '../services/gameService';
import { isGameFinished } from '../services/gameStateHelper';

/**
 * Gerçek zamanlı oyun senkronizasyonu için polling hook
 * 
 * @param {string} gameId - Oyun ID
 * @param {boolean} enabled - Polling aktif mi
 * @param {number} interval - Polling aralığı (ms)
 * @param {Function} onGameUpdate - Oyun güncellendiğinde çağrılacak callback
 * @param {Function} onGameEnd - Oyun bittiğinde çağrılacak callback
 */
export const useGameSync = ({
  gameId,
  enabled = true,
  interval = 2000,
  onGameUpdate,
  onGameEnd,
  currentUserId,
}) => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastVersion, setLastVersion] = useState(0);
  const [syncError, setSyncError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const pollGameState = useCallback(async () => {
    if (!gameId || !enabled || !mountedRef.current) return;

    setIsPolling(true);
    setSyncError(null);

    try {
      const { success, game, error } = await fetchGameState(gameId);

      if (!mountedRef.current) return;

      if (!success) {
        setSyncError(error);
        return;
      }

      // Version kontrolü - sadece yeni güncellemeleri işle
      if (game.version > lastVersion) {
        console.log('Oyun guncellendi:', {
          version: game.version,
          lastVersion,
          currentTurn: game.currentTurn,
        });

        setLastVersion(game.version);

        // Oyun güncellemesi callback'i
        if (onGameUpdate) {
          onGameUpdate(game);
        }

        // Oyun bitti mi kontrol et
        if (isGameFinished(game) && onGameEnd) {
          console.log('Oyun bitti:', game.status);
          onGameEnd(game);
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error('Polling hatasi:', error);
      if (mountedRef.current) {
        setSyncError(error.message);
      }
    } finally {
      if (mountedRef.current) {
        setIsPolling(false);
      }
    }
  }, [gameId, enabled, lastVersion, onGameUpdate, onGameEnd]);

  // Polling başlat
  useEffect(() => {
    if (!gameId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log('Polling baslatildi:', { gameId, interval });

    // İlk çekimi hemen yap
    pollGameState();

    // Periyodik polling
    intervalRef.current = setInterval(pollGameState, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [gameId, enabled, interval, pollGameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Manuel sync tetikle
  const forceSyncNow = useCallback(() => {
    pollGameState();
  }, [pollGameState]);

  return {
    isPolling,
    syncError,
    lastVersion,
    forceSyncNow,
  };
};

/**
 * Sadece multiplayer oyunlar için senkronizasyon
 */
export const useMultiplayerSync = ({
  currentGame,
  currentUserId,
  onGameUpdate,
  onGameEnd,
}) => {
  const isMultiplayer = currentGame && !currentGame.opponentIsBot;
  
  return useGameSync({
    gameId: currentGame?.id,
    enabled: isMultiplayer,
    interval: 2000, // 2 saniyede bir
    onGameUpdate,
    onGameEnd,
    currentUserId,
  });
};
