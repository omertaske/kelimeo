import React from 'react';

const MatchmakingButtons = ({ onFindMatch, onJoinTournament }) => {
  return (
    <div className="match-buttons">
      <button className="match-btn primary" onClick={onFindMatch}>
        🎲 Rastgele Rakip Bul
      </button>
      <button className="match-btn secondary" onClick={onJoinTournament}>
        🏆 Turnuva Katıl
      </button>
    </div>
  );
};

export default MatchmakingButtons;
