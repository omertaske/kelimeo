import React from 'react';

const LeaderboardItem = ({ user, index, currentUserId, getRankIcon, getRankColor, calculateWinRate }) => {
  const isCurrentUser = user.id === currentUserId;
  
  return (
    <div className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}>
      <div className="rank-position">
        {index === 0 && '🥇'}
        {index === 1 && '🥈'}
        {index === 2 && '🥉'}
        {index > 2 && `#${index + 1}`}
      </div>
      
      <div className="player-info">
        <div className="player-name">
          <span className="rank-icon">{getRankIcon(user.rank)}</span>
          <span className="name">{user.username}</span>
          {user.isOnline && <span className="online-dot">🟢</span>}
        </div>
        <div className="player-stats">
          <span>{user.totalScore}p</span>
          <span>•</span>
          <span>{calculateWinRate(user)}% kazanma</span>
        </div>
      </div>

      <div className="score-info">
        <div className="total-score">{user.totalScore}</div>
        <div className="games-played">{user.gamesPlayed} oyun</div>
      </div>
    </div>
  );
};

export default LeaderboardItem;
