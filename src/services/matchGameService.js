import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

/**
 * Match-level game service (Socket.IO)
 * Implements client → server events and subscriptions per eslesme.md
 */
export const useMatchGame = () => {
  const { socket, on, off } = useSocket();
  const { currentUser } = useAuth();

  const joinMatch = useCallback(({ matchId, roomId }) => {
    if (!socket || !currentUser) return;
    socket.emit('join_match', { matchId, roomId, userId: currentUser.id });
  }, [socket, currentUser]);

  const placeTiles = useCallback(({ matchId, roomId, move }) => {
    if (!socket || !currentUser) return;
    socket.emit('place_tiles', { matchId, roomId, userId: currentUser.id, move });
  }, [socket, currentUser]);

  const passTurn = useCallback(({ matchId, roomId }) => {
    if (!socket || !currentUser) return;
    socket.emit('pass_turn', { matchId, roomId, userId: currentUser.id });
  }, [socket, currentUser]);

  const leaveMatch = useCallback(({ matchId, roomId }) => {
    if (!socket || !currentUser) return;
    socket.emit('leave_match', { matchId, roomId, userId: currentUser.id });
  }, [socket, currentUser]);

  const requestFullState = useCallback(({ matchId }) => {
    if (!socket) return;
    socket.emit('request_full_state', { matchId });
  }, [socket]);

  // Subscriptions
  const onGameReady = useCallback((cb) => { on('game_ready', cb); return () => off('game_ready', cb); }, [on, off]);
  const onStatePatch = useCallback((cb) => { on('state_patch', cb); return () => off('state_patch', cb); }, [on, off]);
  const onTurnChanged = useCallback((cb) => { on('turn_changed', cb); return () => off('turn_changed', cb); }, [on, off]);
  const onOpponentLeft = useCallback((cb) => { on('opponent_left', cb); return () => off('opponent_left', cb); }, [on, off]);
  const onGameOver = useCallback((cb) => { on('game_over', cb); return () => off('game_over', cb); }, [on, off]);
  const onMatchError = useCallback((cb) => { on('match_error', cb); return () => off('match_error', cb); }, [on, off]);
  const onWaitingOpponent = useCallback((cb) => { on('waiting_opponent', cb); return () => off('waiting_opponent', cb); }, [on, off]);
  const onFullState = useCallback((cb) => { on('full_state', cb); return () => off('full_state', cb); }, [on, off]);

  return {
    joinMatch,
    placeTiles,
    passTurn,
    leaveMatch,
    requestFullState,
    onGameReady,
    onStatePatch,
    onTurnChanged,
    onOpponentLeft,
    onGameOver,
    onMatchError,
    onWaitingOpponent,
    onFullState,
  };
};
