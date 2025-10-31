import React, { useEffect, useState } from 'react';
import './GameEndScreen.css';
import { useSound } from '../../../hooks/useSound';

const GameEndScreen = ({ isWin, playerScore, opponentScore, onClose, onRematch }) => {
  const [confetti, setConfetti] = useState([]);
  const { playSound } = useSound();

  useEffect(() => {
    // Galibiyet veya mağlubiyet sesini çal
    if (isWin) {
      playSound('galibiyet', 0.7);
      
      // Konfeti oluştur (galibiyet için)
      const newConfetti = [];
      for (let i = 0; i < 100; i++) {
        newConfetti.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 3,
          duration: 3 + Math.random() * 2,
          color: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#95E1D3'][Math.floor(Math.random() * 5)]
        });
      }
      setConfetti(newConfetti);
    } else {
      playSound('maglubiyet', 0.6);
    }
  }, [isWin, playSound]);

  return (
    <div className={`game-end-screen ${isWin ? 'victory' : 'defeat'}`}>
      <div className="game-end-overlay"></div>
      
      {/* Konfeti animasyonu (sadece galibiyet için) */}
      {isWin && (
        <div className="confetti-container">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                backgroundColor: piece.color
              }}
            />
          ))}
        </div>
      )}

      <div className="game-end-content">
        {isWin ? (
          <>
            <div className="trophy-animation">
              <span className="trophy-icon">🏆</span>
              <div className="trophy-glow"></div>
            </div>
            <h1 className="victory-title">
              <span className="sparkle">✨</span>
              {' '}
              KAZANDINIZ!
              {' '}
              <span className="sparkle">✨</span>
            </h1>
            <p className="victory-subtitle">Harika bir performans!</p>
            
            <div className="score-display victory-score">
              <div className="score-item player-score-big">
                <span className="score-label">Sizin Skorunuz</span>
                <span className="score-value winner">{playerScore}</span>
              </div>
              <div className="vs-divider">VS</div>
              <div className="score-item opponent-score-big">
                <span className="score-label">Rakip Skoru</span>
                <span className="score-value loser">{opponentScore}</span>
              </div>
            </div>

            <div className="stars-rating">
              <span className="star">⭐</span>
              <span className="star">⭐</span>
              <span className="star">⭐</span>
            </div>
          </>
        ) : (
          <>
            <div className="defeat-animation">
              <span className="defeat-icon">😔</span>
            </div>
            <h1 className="defeat-title">Kaybettiniz</h1>
            <p className="defeat-subtitle">Bir dahaki sefere daha iyi olacak!</p>
            
            <div className="score-display defeat-score">
              <div className="score-item player-score-big">
                <span className="score-label">Sizin Skorunuz</span>
                <span className="score-value loser">{playerScore}</span>
              </div>
              <div className="vs-divider">VS</div>
              <div className="score-item opponent-score-big">
                <span className="score-label">Rakip Skoru</span>
                <span className="score-value winner">{opponentScore}</span>
              </div>
            </div>

            <div className="motivation-text">
              💪 Vazgeçme! Pratik yaparak gelişebilirsin.
            </div>
          </>
        )}

        <div className="game-end-buttons">
          <button className="end-button primary-button" onClick={onRematch}>
            🔄 Tekrar Oyna
          </button>
          <button className="end-button secondary-button" onClick={onClose}>
            🏠 Ana Menü
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEndScreen;
