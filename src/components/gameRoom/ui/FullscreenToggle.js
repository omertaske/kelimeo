import React from 'react';

const FullscreenToggle = ({ isFullscreen, onToggle }) => {
  return (
    <button 
      className="fullscreen-toggle"
      onClick={onToggle}
      title={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
    >
      {isFullscreen ? '🗙' : '⛶'}
    </button>
  );
};

export default FullscreenToggle;
