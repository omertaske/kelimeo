import React from 'react';

const DemoButton = ({ onClick, loading }) => {
  return (
    <>
      <div className="auth-divider">
        <span>veya</span>
      </div>

      <button 
        type="button"
        className="auth-button demo"
        onClick={onClick}
        disabled={loading}
      >
        🎮 Demo ile Dene
      </button>
    </>
  );
};

export default DemoButton;
