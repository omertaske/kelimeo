import React from 'react';
import LeaderboardItem from './LeaderboardItem';

const Leaderboard = ({ leaderboard, currentUserId, getRankIcon, getRankColor, calculateWinRate }) => {
  return (
    <div className="leaderboard-section">
      <h3>🏆 Liderlik Tablosu</h3>
      <div className="leaderboard">
        {leaderboard.map((user, index) => (
          <LeaderboardItem
            key={user.id}
            user={user}
            index={index}
            currentUserId={currentUserId}
            getRankIcon={getRankIcon}
            getRankColor={getRankColor}
            calculateWinRate={calculateWinRate}
          />
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
