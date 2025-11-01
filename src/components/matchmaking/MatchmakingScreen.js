import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRoomMatchmaking } from '../../services/roomMatchmakingService';
import { useMatchGame } from '../../services/matchGameService';
import { useSocket } from '../../context/SocketContext';
import './MatchmakingScreen.css';

/**
 * Matchmaking Screen Component
 * Handles socket-based room matchmaking
 */
const MatchmakingScreen = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [status, setStatus] = useState('connecting'); // connecting, searching, matched, error
  const [queueInfo, setQueueInfo] = useState({ waitingCount: 0 });
  const [matchData, setMatchData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const hasJoinedRef = useRef(false); // Track if already joined (stable across renders)

  const {
    isConnected,
    joinRoomAndMatch,
    leaveRoomAndCancel,
    onMatchFound,
    onMatchCancelled,
    onQueueStatus,
    onError,
  } = useRoomMatchmaking();
  const { joinMatch } = useMatchGame();

  // Separate effect for event listeners (runs once)
  useEffect(() => {
    console.log('🎧 Setting up event listeners...');

    // Listen for match found
    const cleanupMatchFound = onMatchFound((data) => {
      console.log('🎉 Match found!', data);
      setStatus('matched');
      setMatchData(data);

      // Immediately join the match room on server
      joinMatch({ matchId: data.matchId, roomId });

  // Navigate to game route after 2 seconds (GameRoom UI)
      setTimeout(() => {
        navigate(`/game/${roomId}`, {
          state: {
            matchId: data.matchId,
            partnerId: data.partnerId,
            role: data.role,
          }
        });
      }, 2000);
    });

    // Listen for match cancelled
    const cleanupMatchCancelled = onMatchCancelled((data) => {
      console.log('❌ Match cancelled:', data);
      setStatus('searching');
      setMatchData(null);
    });

    // Listen for queue status
    const cleanupQueueStatus = onQueueStatus((data) => {
      console.log('⏳ Queue status:', data);
      setQueueInfo(data);
    });

    // Listen for errors
    const cleanupError = onError((data) => {
      console.error('🔥 Socket error:', data);
      setStatus('error');
      setErrorMessage(data.message);
    });

    // Cleanup only on unmount
    return () => {
      console.log('🧹 Cleaning up event listeners...');
      cleanupMatchFound();
      cleanupMatchCancelled();
      cleanupQueueStatus();
      cleanupError();
    };
  }, [onMatchFound, onMatchCancelled, onQueueStatus, onError, navigate, roomId, joinMatch]);

  // Separate effect for joining room (runs when connected)
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    if (!roomId) {
      navigate('/rooms');
      return;
    }

    // Socket bağlantısı kurulana kadar bekle
    if (!isConnected) {
      setStatus('connecting');
      return;
    }

    // Sadece bir kez join et
    if (hasJoinedRef.current) {
      console.log('⏭️ Already joined room (ref), skipping...');
      return;
    }

    console.log(`🎮 Starting matchmaking for room: ${roomId}`);
    setStatus('searching');
    hasJoinedRef.current = true;

    // Odaya gir ve matchmaking başlat
    joinRoomAndMatch(roomId)
      .then((result) => {
        if (result.success) {
          console.log('✅ Joined room successfully:', result);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Failed to join room');
          hasJoinedRef.current = false; // Reset on error
        }
      })
      .catch((err) => {
        console.error('❌ Error joining room:', err);
        setStatus('error');
        setErrorMessage(err.message);
        hasJoinedRef.current = false; // Reset on error
      });

    // Cleanup: Leave room on unmount
    return () => {
      console.log('🧹 Leaving room on unmount...');
      leaveRoomAndCancel(roomId);
      hasJoinedRef.current = false;
    };
  }, [roomId, currentUser, navigate, isConnected, joinRoomAndMatch, leaveRoomAndCancel]);

  const handleCancel = () => {
    leaveRoomAndCancel(roomId);
    navigate('/rooms');
  };

  return (
    <div className="matchmaking-screen">
      <div className="matchmaking-container">
        
        {/* Connecting */}
        {status === 'connecting' && (
          <div className="matchmaking-status">
            <div className="spinner"></div>
            <h2>🔌 Bağlanıyor...</h2>
            <p>Sunucuya bağlanıyor, lütfen bekleyin</p>
          </div>
        )}

        {/* Searching */}
        {status === 'searching' && (
          <div className="matchmaking-status">
            <div className="spinner"></div>
            <h2>🔍 Rakip Aranıyor...</h2>
            <p>Odada {queueInfo.waitingCount || 0} oyuncu bekleniyor</p>
            {queueInfo.needsMore > 0 && (
              <p className="need-more">+{queueInfo.needsMore} oyuncu daha gerekli</p>
            )}
            <div className="room-info">
              <span className="room-badge">{roomId}</span>
            </div>
            {/* Debug info for quick diagnosis */}
            <div className="debug-info" style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              <div>Ben: <strong>{currentUser?.username}</strong> (id: {currentUser?.id})</div>
              <div>Socket: {socket?.id || 'yok'}</div>
            </div>
            <button className="cancel-button" onClick={handleCancel}>
              ❌ İptal Et
            </button>
          </div>
        )}

        {/* Matched */}
        {status === 'matched' && matchData && (
          <div className="matchmaking-status matched">
            <div className="success-icon">✅</div>
            <h2>🎉 Rakip Bulundu!</h2>
            <p>Eşleşme ID: {matchData.matchId.substring(0, 8)}...</p>
            <p>Rol: {matchData.role === 'player1' ? '🔵 Oyuncu 1' : '🔴 Oyuncu 2'}</p>
            <p className="loading-game">Oyuna yönlendiriliyorsunuz...</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="matchmaking-status error">
            <div className="error-icon">❌</div>
            <h2>Hata Oluştu</h2>
            <p>{errorMessage}</p>
            <button className="retry-button" onClick={() => navigate('/rooms')}>
              🔙 Odalara Dön
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default MatchmakingScreen;
