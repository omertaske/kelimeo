import React, { useState, useEffect } from 'react';
import { markPlayerReady } from '../../utils/multiplayerHelpers';
import { fetchGameState, startGameCountdown } from '../../services/gameService';

const WaitingMatch = ({ 
  selectedOpponent, 
  currentUser,
  gameId,
  onBothReady 
}) => {
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [countdown, setCountdown] = useState(null);

  // Rakibin hazır durumunu kontrol et (polling)
  useEffect(() => {
    if (!gameId || !isReady || opponentReady || countdown !== null || !selectedOpponent) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const { success, game } = await fetchGameState(gameId);
        if (success && game) {
          // Rakip hazır mı kontrol et
          const player1Ready = game.player1Ready || false;
          const player2Ready = game.player2Ready || false;
          
          // Eğer her iki oyuncu da hazırsa
          if (player1Ready && player2Ready) {
            setOpponentReady(true);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Polling hatasi:', error);
      }
    }, 1000); // 1 saniyede bir kontrol

    return () => {
      clearInterval(pollInterval);
    };
  }, [gameId, isReady, opponentReady, countdown, selectedOpponent]);

  useEffect(() => {
    // Her iki oyuncu da hazırsa countdown başlat
    if (isReady && opponentReady && countdown === null) {
      setCountdown(5);
    }
  }, [isReady, opponentReady, countdown]);

  useEffect(() => {
    // Countdown logic
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Countdown bitti, oyunu active duruma çek
      if (gameId) {
        startGameCountdown(gameId).then(() => {
          console.log('Oyun active duruma getirildi');
        });
      }
      
      // Oyunu başlat
      onBothReady?.();
    }
  }, [countdown, onBothReady, gameId]);

  const handleReadyClick = async () => {
    setIsReady(true);
    
    // API'ye ready durumunu bildir
    if (gameId && currentUser?.id) {
      try {
        await markPlayerReady({
          gameId,
          playerId: currentUser.id,
        });
        console.log('Hazir durumu APIye bildirildi');
      } catch (error) {
        console.error('Hazir durumu bildirilemedi:', error);
      }
    }
  };

  // Eğer henüz opponent yoksa, sadece bekleme ekranı göster
  if (!selectedOpponent) {
    return (
      <div className="waiting-match">
        <div className="loading-spinner">⏳</div>
        <p>Rakip aranıyor...</p>
        <p className="waiting-subtitle">Başka bir oyuncu katılması bekleniyor</p>
      </div>
    );
  }

  if (countdown !== null) {
    return (
      <div className="waiting-match countdown-screen">
        <div className="countdown-circle">
          <span className="countdown-number">{countdown}</span>
        </div>
        <p className="countdown-text">Oyun başlıyor...</p>
      </div>
    );
  }

  return (
    <div className="waiting-match ready-screen">
      <div className="players-ready-container">
        <div className={`player-ready-box ${isReady ? 'ready' : ''}`}>
          <div className="player-avatar">
            <span className="avatar-icon">{currentUser?.username?.[0]?.toUpperCase() || '?'}</span>
          </div>
          <p className="player-name">{currentUser?.username || 'Siz'}</p>
          <div className="ready-status">
            {isReady ? (
              <span className="ready-checkmark">✓</span>
            ) : (
              <button className="ready-button" onClick={handleReadyClick}>
                HAZIR
              </button>
            )}
          </div>
        </div>

        <div className="vs-divider">VS</div>

        <div className={`player-ready-box ${opponentReady ? 'ready' : ''}`}>
          <div className="player-avatar">
            <span className="avatar-icon">
              {selectedOpponent?.username?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <p className="player-name">{selectedOpponent?.username || 'Rakip'}</p>
          <div className="ready-status">
            {opponentReady ? (
              <span className="ready-checkmark">✓</span>
            ) : (
              <span className="waiting-text">Bekleniyor...</span>
            )}
          </div>
        </div>
      </div>

      {isReady && !opponentReady && (
        <p className="waiting-message">Rakibinizin hazır olması bekleniyor...</p>
      )}
    </div>
  );
};

export default WaitingMatch;
