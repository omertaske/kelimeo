import React from 'react';

const GameHeader = ({ 
  roomType, 
  timeLeft, 
  isUrgent, 
  isWarning,
  currentTurn, 
  playerScore, 
  opponentScore, 
  opponentName,
  opponentIsBot,
  onLeave 
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="game-header">
      <div className="room-title">
        <h2>{roomType.icon} {roomType.name}</h2>
      </div>
      
      <div className="game-info">
        <div className="timer-section">
          <div className={`game-timer ${isUrgent ? 'urgent' : isWarning ? 'warning' : ''}`}>
            ⏰ {formatTime(timeLeft)}
          </div>
          <div className="turn-indicator">
            {currentTurn === 'player' ? '🎯 Sizin sıranız' : '🤖 Rakip oynuyor'}
          </div>
        </div>
        
        <div className="score-section">
          <div className="score-board">
            <div className="player-score">
              <span className="score-label">👤 Sen</span>
              <span className="score-value">{playerScore}</span>
            </div>
            <div className="vs-separator">VS</div>
            <div className="opponent-score">
              <span className="score-label">{opponentIsBot ? '🤖' : '👤'} {opponentName}</span>
              <span className="score-value">{opponentScore}</span>
            </div>
          </div>
        </div>
        
        <button className="leave-button" onClick={onLeave}>
          🚪 Çıkış
        </button>
      </div>
    </div>
  );
};

export default GameHeader;
