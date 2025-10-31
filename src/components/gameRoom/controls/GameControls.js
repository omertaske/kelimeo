import React from 'react';

const GameControls = ({ 
  onSubmit, 
  onClear, 
  onShuffle, 
  onPass,
  canSubmit,
  canClear,
  isPlayerTurn,
  isSubmitting
}) => {
  return (
    <div className="rack-controls">
      <button
        className="control-button primary"
        onClick={onSubmit}
        disabled={!canSubmit || !isPlayerTurn || isSubmitting}
      >
        ✅ Gönder
      </button>
      
      <button
        className="control-button secondary"
        onClick={onClear}
        disabled={!canClear}
      >
        🗑️ Temizle
      </button>
      
      <button
        className="control-button secondary"
        onClick={onShuffle}
        disabled={!isPlayerTurn}
      >
        🔀 Karıştır
      </button>
      
      <button
        className="control-button secondary"
        onClick={onPass}
        disabled={!isPlayerTurn}
      >
        ⏭️ Pas
      </button>
    </div>
  );
};

export default GameControls;
