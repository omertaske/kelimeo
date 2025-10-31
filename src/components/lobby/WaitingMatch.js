import React from 'react';

const WaitingMatch = ({ selectedOpponent }) => {
  return (
    <div className="waiting-match">
      <div className="loading-spinner">⏳</div>
      <p>
        {selectedOpponent 
          ? `${selectedOpponent.username} ile eşleşiliyor...` 
          : 'Rakip aranıyor...'
        }
      </p>
    </div>
  );
};

export default WaitingMatch;
