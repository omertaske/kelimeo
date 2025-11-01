import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

/**
 * Room-based matchmaking service using Socket.IO
 * Replaces MockAPI-based matchmaking with real-time socket events
 */

/**
 * Hook for room-based matchmaking
 * @returns {Object} Matchmaking functions and state
 */
export const useRoomMatchmaking = () => {
  const { socket, isConnected, enterRoom, leaveRoom, setActive, cancelMatchmaking, on, off } = useSocket();
  const { currentUser } = useAuth();

  /**
   * Join a room and start matchmaking
   * @param {string} roomId 
   * @returns {Promise<Object>}
   */
  const joinRoomAndMatch = useCallback(async (roomId) => {
    if (!isConnected || !currentUser) {
      throw new Error('Socket not connected or user not logged in');
    }

    try {
      console.log(`🎮 Joining room and starting matchmaking: ${roomId}`);
      
      // Enter room
      const joinResult = await enterRoom(roomId);
      
      // Set active to trigger matching
      setActive(roomId, true);
      
      return {
        success: true,
        roomId,
        activeCount: joinResult.activeCount,
      };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }, [isConnected, currentUser, enterRoom, setActive]);

  /**
   * Leave room and cancel matchmaking
   * @param {string} roomId 
   */
  const leaveRoomAndCancel = useCallback((roomId) => {
    if (!isConnected || !currentUser) return;

    console.log(`📤 Leaving room: ${roomId}`);
    
    // Cancel matchmaking first
    cancelMatchmaking(roomId);
    
    // Then leave room
    leaveRoom(roomId);
  }, [isConnected, currentUser, cancelMatchmaking, leaveRoom]);

  /**
   * Listen for match found
   * @param {Function} callback - Called when match is found
   * @returns {Function} Cleanup function
   */
  const onMatchFound = useCallback((callback) => {
    const handler = (data) => {
      console.log('🎉 Match found!', data);
      callback(data);
    };
    
    on('matched', handler);
    
    // Return cleanup function
    return () => off('matched', handler);
  }, [on, off]);

  /**
   * Listen for match cancelled
   * @param {Function} callback 
   * @returns {Function} Cleanup function
   */
  const onMatchCancelled = useCallback((callback) => {
    const handler = (data) => {
      console.log('❌ Match cancelled:', data);
      callback(data);
    };
    
    on('matchCancelled', handler);
    
    return () => off('matchCancelled', handler);
  }, [on, off]);

  /**
   * Listen for queue status updates
   * @param {Function} callback 
   * @returns {Function} Cleanup function
   */
  const onQueueStatus = useCallback((callback) => {
    const handler = (data) => {
      console.log('⏳ Queue status:', data);
      callback(data);
    };
    
    on('queueStatus', handler);
    
    return () => off('queueStatus', handler);
  }, [on, off]);

  /**
   * Listen for errors
   * @param {Function} callback 
   * @returns {Function} Cleanup function
   */
  const onError = useCallback((callback) => {
    const handler = (data) => {
      console.error('🔥 Socket error:', data);
      callback(data);
    };
    
    on('error', handler);
    
    return () => off('error', handler);
  }, [on, off]);

  return {
    socket,
    isConnected,
    joinRoomAndMatch,
    leaveRoomAndCancel,
    onMatchFound,
    onMatchCancelled,
    onQueueStatus,
    onError,
  };
};

/**
 * Legacy API for compatibility (can be removed later)
 * These functions now use socket.io instead of MockAPI
 */

export const findOrCreateGame = async ({ userId, boardId }) => {
  console.warn('⚠️ findOrCreateGame is deprecated. Use useRoomMatchmaking hook instead.');
  
  // This is now handled by socket events
  // Just return a placeholder for compatibility
  return {
    success: true,
    message: 'Use socket-based matchmaking instead',
    useSocketMatchmaking: true,
  };
};

export const findWaitingGame = async (boardId) => {
  console.warn('⚠️ findWaitingGame is deprecated. Use useRoomMatchmaking hook instead.');
  
  return {
    success: true,
    game: null,
    useSocketMatchmaking: true,
  };
};

export const joinWaitingGame = async (gameId, player2Id) => {
  console.warn('⚠️ joinWaitingGame is deprecated. Use useRoomMatchmaking hook instead.');
  
  return {
    success: true,
    useSocketMatchmaking: true,
  };
};
