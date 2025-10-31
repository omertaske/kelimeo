import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { currentUser, updateUserStats } = useAuth();
  const [gameHistory, setGameHistory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({
    winRate: 0,
    averageScore: 0,
    totalPlayTime: 0,
    favoriteBoard: 'classic',
    longestWord: '',
    bestStreak: 0
  });

  useEffect(() => {
    if (currentUser) {
      loadGameHistory();
      loadAchievements();
      calculateStats();
    }
  }, [currentUser]);

  const loadGameHistory = () => {
    // Simüle edilmiş oyun geçmişi
    const mockHistory = [
      {
        id: 1,
        date: '2025-10-29',
        opponent: 'ScrabbleMaster',
        board: 'classic',
        result: 'win',
        playerScore: 285,
        opponentScore: 240,
        duration: '12:45',
        bestWord: 'KELİME'
      },
      {
        id: 2,
        date: '2025-10-28',
        opponent: 'WordWizard',
        board: 'hexagonal',
        result: 'loss',
        playerScore: 195,
        opponentScore: 220,
        duration: '8:30',
        bestWord: 'HARF'
      },
      {
        id: 3,
        date: '2025-10-27',
        opponent: 'Bot Player',
        board: 'circular',
        result: 'win',
        playerScore: 310,
        opponentScore: 180,
        duration: '15:20',
        bestWord: 'SCRABBLE'
      }
    ];
    setGameHistory(mockHistory);
  };

  const loadAchievements = () => {
    const mockAchievements = [
      {
        id: 1,
        title: 'İlk Adım',
        description: 'İlk oyununuzu oynadınız!',
        icon: '🎯',
        unlocked: true,
        date: '2025-10-25'
      },
      {
        id: 2,
        title: 'Kelime Ustası',
        description: '50+ puanlık kelime kurdunuz',
        icon: '📚',
        unlocked: true,
        date: '2025-10-26'
      },
      {
        id: 3,
        title: 'Seri Galip',
        description: 'Üst üste 3 oyun kazandınız',
        icon: '🔥',
        unlocked: false,
        progress: 2,
        target: 3
      },
      {
        id: 4,
        title: 'Harf Koleksiyoncusu',
        description: 'Tüm harfleri en az bir kez kullandınız',
        icon: '🎲',
        unlocked: false,
        progress: 24,
        target: 29
      }
    ];
    setAchievements(mockAchievements);
  };

  const calculateStats = () => {
    if (!currentUser) return;

    const winRate = currentUser.gamesPlayed > 0 
      ? Math.round((currentUser.gamesWon / currentUser.gamesPlayed) * 100)
      : 0;
    
    const averageScore = currentUser.gamesPlayed > 0
      ? Math.round(currentUser.totalScore / currentUser.gamesPlayed)
      : 0;

    setStats({
      winRate,
      averageScore,
      totalPlayTime: Math.round(currentUser.gamesPlayed * 12.5), // Ortalama oyun süresi
      favoriteBoard: 'classic',
      longestWord: 'SCRABBLE',
      bestStreak: 5
    });
  };

  const getBoardIcon = (board) => {
    const icons = {
      classic: '🏛️',
      hexagonal: '🔷',
      circular: '🎯',
      star: '⭐'
    };
    return icons[board] || '🎮';
  };

  const getBoardName = (board) => {
    const names = {
      classic: 'Klasik',
      hexagonal: 'Altıgen',
      circular: 'Dairesel',
      star: 'Yıldız'
    };
    return names[board] || board;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) return '🏆';
    if (rank <= 10) return '🥉';
    if (rank <= 50) return '🏅';
    return '📊';
  };

  if (!currentUser) {
    return (
      <div className="profile error">
        <h2>❌ Kullanıcı bilgisi bulunamadı!</h2>
      </div>
    );
  }

  return (
    <div className="profile">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-card">
          <div className="profile-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          
          <div className="profile-info">
            <h1 className="profile-name">{currentUser.username}</h1>
            <p className="profile-title">Scrabble Oyuncusu</p>
            <div className="profile-badges">
              <span className="badge rank-badge">
                {getRankIcon(currentUser.rank || 0)} #{currentUser.rank || 'Yeni'}
              </span>
              <span className="badge level-badge">
                ⭐ Seviye {Math.floor((currentUser.gamesWon || 0) / 5) + 1}
              </span>
            </div>
          </div>
          
          <div className="profile-stats-summary">
            <div className="stat-item">
              <span className="stat-value">{currentUser.gamesPlayed || 0}</span>
              <span className="stat-label">Oyun</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{currentUser.gamesWon || 0}</span>
              <span className="stat-label">Galibiyet</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{currentUser.bestScore || 0}</span>
              <span className="stat-label">En İyi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-title">Kazanma Oranı</span>
            <span className="stat-number">{stats.winRate}%</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <span className="stat-title">Ortalama Puan</span>
            <span className="stat-number">{stats.averageScore}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <span className="stat-title">Toplam Süre</span>
            <span className="stat-number">{stats.totalPlayTime}dk</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <span className="stat-title">Favori Tahta</span>
            <span className="stat-number">{getBoardName(stats.favoriteBoard)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-content">
        {/* Game History */}
        <div className="section game-history-section">
          <h2 className="section-title">🎮 Son Oyunlar</h2>
          <div className="game-history">
            {gameHistory.length > 0 ? (
              gameHistory.map(game => (
                <div key={game.id} className="game-item">
                  <div className="game-info">
                    <div className="game-header">
                      <span className="game-board">
                        {getBoardIcon(game.board)} {getBoardName(game.board)}
                      </span>
                      <span className="game-date">{formatDate(game.date)}</span>
                    </div>
                    
                    <div className="game-details">
                      <span className="opponent">vs {game.opponent}</span>
                      <span className="duration">⏱️ {game.duration}</span>
                    </div>
                    
                    <div className="game-result">
                      <span className={`result-badge ${game.result}`}>
                        {game.result === 'win' ? '🏆 Galibiyit' : '💔 Yenilgi'}
                      </span>
                      <span className="score">
                        {game.playerScore} - {game.opponentScore}
                      </span>
                    </div>
                    
                    <div className="best-word">
                      <span>En iyi kelime: <strong>{game.bestWord}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🎯</span>
                <p>Henüz oyun oynamadınız!</p>
              </div>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="section achievements-section">
          <h2 className="section-title">🏆 Başarılar</h2>
          <div className="achievements-grid">
            {achievements.map(achievement => (
              <div 
                key={achievement.id} 
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="achievement-icon">
                  {achievement.unlocked ? achievement.icon : '🔒'}
                </div>
                
                <div className="achievement-info">
                  <h3 className="achievement-title">{achievement.title}</h3>
                  <p className="achievement-description">{achievement.description}</p>
                  
                  {achievement.unlocked ? (
                    <span className="achievement-date">
                      {formatDate(achievement.date)}
                    </span>
                  ) : achievement.progress !== undefined ? (
                    <div className="achievement-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {achievement.progress}/{achievement.target}
                      </span>
                    </div>
                  ) : (
                    <span className="achievement-locked">Henüz açılmadı</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;