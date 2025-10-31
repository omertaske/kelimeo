import React from 'react';
import OnlineUser from './OnlineUser';

const OnlineUsers = ({ users, getRankIcon, onChallenge }) => {
  return (
    <div className="online-section">
      <h4>🟢 Çevrimiçi Oyuncular ({users.length})</h4>
      <div className="online-users">
        {users.slice(0, 6).map(user => (
          <OnlineUser
            key={user.id}
            user={user}
            getRankIcon={getRankIcon}
            onChallenge={onChallenge}
          />
        ))}
      </div>
    </div>
  );
};

export default OnlineUsers;
