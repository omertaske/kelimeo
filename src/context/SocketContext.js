import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Socket server URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000';

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect if user is logged in
    if (!currentUser) {
      // Disconnect if logged out
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket (user logged out)');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    console.log('🔌 Connecting to socket server:', SOCKET_URL);
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔥 Socket connection error:', error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser]);

  /**
   * Enter a room
   * @param {string} roomId 
   * @returns {Promise}
   */
  const enterRoom = (roomId) => {
    return new Promise((resolve, reject) => {
      if (!socket || !currentUser) {
        reject(new Error('Socket not connected or user not logged in'));
        return;
      }

      console.log(`📥 Entering room: ${roomId} as ${currentUser.id}`);

      // Listen for confirmation
      const handleRoomJoined = (data) => {
        console.log('✅ Room joined:', data);
        setCurrentRoom(roomId);
        socket.off('roomJoined', handleRoomJoined);
        resolve(data);
      };

      socket.once('roomJoined', handleRoomJoined);

      // Emit enter room event
      socket.emit('enterRoom', {
        roomId,
        userId: currentUser.id,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        socket.off('roomJoined', handleRoomJoined);
        reject(new Error('Room join timeout'));
      }, 5000);
    });
  };

  /**
   * Leave current room
   * @param {string} roomId 
   */
  const leaveRoom = (roomId) => {
    if (!socket || !currentUser) return;

    console.log(`📤 Leaving room: ${roomId}`);
    
    socket.emit('leaveRoom', {
      roomId,
      userId: currentUser.id,
    });

    setCurrentRoom(null);
  };

  /**
   * Set active status in room
   * @param {string} roomId 
   * @param {boolean} active 
   */
  const setActive = (roomId, active) => {
    if (!socket || !currentUser) return;

    console.log(`🎯 Setting active status: ${active} in ${roomId}`);
    
    socket.emit('setActive', {
      roomId,
      userId: currentUser.id,
      active,
    });
  };

  /**
   * Cancel matchmaking
   * @param {string} roomId 
   */
  const cancelMatchmaking = (roomId) => {
    if (!socket || !currentUser) return;

    console.log(`❌ Cancelling matchmaking in ${roomId}`);
    
    socket.emit('cancelMatchmaking', {
      roomId,
      userId: currentUser.id,
    });
  };

  /**
   * Accept a match
   * @param {string} roomId 
   * @param {string} matchId 
   */
  const acceptMatch = (roomId, matchId) => {
    if (!socket || !currentUser) return;

    console.log(`✅ Accepting match: ${matchId} in ${roomId}`);
    
    socket.emit('acceptMatch', {
      roomId,
      matchId,
      userId: currentUser.id,
    });
  };

  /**
   * Get room status
   * @param {string} roomId 
   */
  const getRoomStatus = (roomId) => {
    if (!socket) return;

    socket.emit('getRoomStatus', { roomId });
  };

  /**
   * Subscribe to socket events
   * @param {string} event 
   * @param {Function} callback 
   */
  const on = (event, callback) => {
    if (!socket) return;
    socket.on(event, callback);
  };

  /**
   * Unsubscribe from socket events
   * @param {string} event 
   * @param {Function} callback 
   */
  const off = (event, callback) => {
    if (!socket) return;
    socket.off(event, callback);
  };

  const value = {
    socket,
    isConnected,
    currentRoom,
    enterRoom,
    leaveRoom,
    setActive,
    cancelMatchmaking,
    acceptMatch,
    getRoomStatus,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export default SocketContext;
