import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { gameState, GAME_STATES, leaveGame } = useGame();

  const handleLogout = () => {
    if (gameState === GAME_STATES.PLAYING) {
      if (window.confirm('Oyundan çıkmak istediğinize emin misiniz? Bu durum yenilgi sayılacaktır!')) {
        leaveGame();
        logout();
        navigate('/auth');
      }
    } else {
      logout();
      navigate('/auth');
    }
  };

  const handleNavigation = (path) => {
    if (gameState === GAME_STATES.PLAYING && !path.includes('/game/')) {
      if (window.confirm('Oyundan çıkmak istediğinize emin misiniz? Bu durum yenilgi sayılacaktır!')) {
        leaveGame();
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      {/* Header Navigation */}
      <header className="layout-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="app-title" onClick={() => handleNavigation('/rooms')}>
              🎯 Kelimeo Scrabble
            </h1>
            {gameState === GAME_STATES.PLAYING && (
              <div className="game-status">
                <span className="status-indicator">🎮 Oyunda</span>
              </div>
            )}
          </div>

          <nav className="main-nav">
            <button 
              className={`nav-button ${isActive('/rooms') ? 'active' : ''}`}
              onClick={() => handleNavigation('/rooms')}
              disabled={gameState === GAME_STATES.PLAYING}
            >
              🏠 Odalar
            </button>
            <button 
              className={`nav-button ${isActive('/letters') ? 'active' : ''}`}
              onClick={() => handleNavigation('/letters')}
              disabled={gameState === GAME_STATES.PLAYING}
            >
              🔤 Harf Çalışması
            </button>
            <button 
              className={`nav-button ${isActive('/profile') ? 'active' : ''}`}
              onClick={() => handleNavigation('/profile')}
              disabled={gameState === GAME_STATES.PLAYING}
            >
              👤 Profil
            </button>
          </nav>

          <div className="user-section">
            <div className="user-info">
              <span className="username">👋 {currentUser?.username}</span>
              <div className="user-stats">
                <span>🏆 {currentUser?.gamesWon || 0}/{currentUser?.gamesPlayed || 0}</span>
                <span>⭐ {currentUser?.bestScore || 0}</span>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout}>
              🚪 Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="layout-footer">
        <div className="footer-content">
          <p>&copy; 2025 Kelimeo Scrabble - Türkçe Kelime Oyunu</p>
          <div className="footer-links">
            <span>v1.0.0</span>
            <span>|</span>
            <span>Made with ❤️</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;