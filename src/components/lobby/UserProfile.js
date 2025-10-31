import React from 'react';

const UserProfile = ({ user, userRank, getRankIcon, getRankColor, calculateWinRate, onLogout }) => {
  return (
    <div className="lobby-header">
      <div className="user-profile">
        <div className="profile-info">
          <h2>🎯 {user.username}</h2>
          <div className="user-rank">
            <span className="rank-badge" style={{ background: getRankColor(user.rank) }}>
              {getRankIcon(user.rank)} {user.rank}
            </span>
            <span className="leaderboard-position">#{userRank}</span>
          </div>
        </div>
        <div className="user-stats">
          <div className="stat">
            <span className="stat-value">{user.totalScore}</span>
            <span className="stat-label">Toplam Puan</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.bestScore}</span>
            <span className="stat-label">En Yüksek</span>
          </div>
          <div className="stat">
            <span className="stat-value">{calculateWinRate(user)}%</span>
            <span className="stat-label">Kazanma</span>
          </div>
        </div>
      </div>
      <button className="logout-btn" onClick={onLogout}>
        🚪 Çıkış
      </button>
    </div>
  );
};

export default UserProfile;
