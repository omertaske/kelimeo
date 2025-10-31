import React from 'react';

const OnlineUser = ({ user, getRankIcon, onChallenge }) => {
  return (
    <div className="online-user" onClick={() => onChallenge(user)}>
      <div className="user-avatar">
        {getRankIcon(user.rank)}
      </div>
      <div className="user-info">
        <span className="username">{user.username}</span>
        <span className="user-score">{user.totalScore}p</span>
      </div>
      <button className="challenge-btn">⚔️</button>
    </div>
  );
};

export default OnlineUser;
