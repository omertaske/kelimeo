import React, { useState, useEffect, useCallback } from 'react';
import './GameLobby.css';
import { useAuth } from '../../context/AuthContext';
import { calculateWinRate } from '../../utils/game/scoreUtils';
import { createGame } from '../../services/gameService';
import { createGameState } from '../../services/gameStateHelper';
import UserProfile from './UserProfile';
import MatchmakingButtons from './MatchmakingButtons';
import WaitingMatch from './WaitingMatch';
import OnlineUsers from './OnlineUsers';
import Leaderboard from './Leaderboard';

const GameLobby = ({ currentUser, onStartGame, onLogout }) => {
  const { users: allUsers } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [waitingForMatch, setWaitingForMatch] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [matchGameId, setMatchGameId] = useState(null);

  const getRankIcon = (rank) => {
    const rankIcons = {
      Acemi: '🌱',
      'Çırak': '🛠️',
      'Stajyer Kelimeci': '📖',
      'Kelime Kaşifi': '🧭',
      'Sözcük Avcısı': '🎯',
      'Dil Ustası': '📚',
      'Strateji Uzmanı': '♜',
      'Söz Bilgesi': '💎',
      'Şampiyon Kelimeci': '🏆',
      'Usta': '👑'
    };
    return rankIcons[rank] || '🎯';
  };

  const getRankColor = (rank) => {
    const rankColors = {
      Acemi: '#7f8c8d',
      'Çırak': '#3498db',
      'Stajyer Kelimeci': '#1abc9c',
      'Kelime Kaşifi': '#16a085',
      'Sözcük Avcısı': '#27ae60',
      'Dil Ustası': '#8e44ad',
      'Strateji Uzmanı': '#2980b9',
      'Söz Bilgesi': '#f1c40f',
      'Şampiyon Kelimeci': '#e67e22',
      'Usta': '#e74c3c'
    };
    return rankColors[rank] || '#34495e';
  };

  const updateLeaderboard = useCallback((usersData) => {
    const sorted = [...usersData]
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        const aWinRate = calculateWinRate(a.gamesWon, a.gamesPlayed);
        const bWinRate = calculateWinRate(b.gamesWon, b.gamesPlayed);
        if (bWinRate !== aWinRate) {
          return bWinRate - aWinRate;
        }
        return b.bestScore - a.bestScore;
      })
      .slice(0, 10);

    setLeaderboard(sorted);
  }, []);

  const updateOnlineUsers = useCallback((usersData) => {
    if (!currentUser) {
      setOnlineUsers([]);
      return;
    }

    const simulated = usersData
      .filter((user) => user.id !== currentUser.id)
      .map((user) => ({
        ...user,
        simulatedOnline: user.isOnline || Math.random() > 0.7
      }))
      .filter((user) => user.simulatedOnline);

    setOnlineUsers(simulated);
  }, [currentUser]);

  useEffect(() => {
    if (!allUsers || !currentUser) {
      setLeaderboard([]);
      setOnlineUsers([]);
      return;
    }

    const humanUsers = allUsers.filter((user) => !user.isBot);
    updateLeaderboard(humanUsers);
    updateOnlineUsers(humanUsers);
  }, [allUsers, currentUser, updateLeaderboard, updateOnlineUsers]);

  const getUserCurrentRank = () => {
    const userRank = leaderboard.findIndex(user => user.id === currentUser.id) + 1;
    return userRank || 'Unranked';
  };

  const findRandomMatch = async () => {
    if (onlineUsers.length === 0) {
      alert('Şu anda çevrimiçi rakip bulunamadı! 😕');
      return;
    }

    const randomOpponent = onlineUsers[Math.floor(Math.random() * onlineUsers.length)];
    setSelectedOpponent(randomOpponent);
    setWaitingForMatch(true);
    
    // API'de gerçek oyun oluştur
    const gameId = `game_${Date.now()}`;
    const gameState = createGameState({
      gameId,
      player1Id: currentUser.id,
      player2Id: randomOpponent.id,
      boardId: 'classic', // Varsayılan tahta
    });

    const { success, game } = await createGame(gameState);
    if (success) {
      setMatchGameId(game.id);
      console.log('Oyun API\'de olusturuldu:', game.id);
    } else {
      alert('Oyun oluşturulamadı! Lütfen tekrar deneyin.');
      setWaitingForMatch(false);
    }
  };

  const challengeUser = async (opponent) => {
    setSelectedOpponent(opponent);
    setWaitingForMatch(true);
    
    // API'de gerçek oyun oluştur
    const gameId = `game_${Date.now()}`;
    const gameState = createGameState({
      gameId,
      player1Id: currentUser.id,
      player2Id: opponent.id,
      boardId: 'classic', // Varsayılan tahta
    });

    const { success, game } = await createGame(gameState);
    if (success) {
      setMatchGameId(game.id);
      console.log('Oyun API\'de olusturuldu:', game.id);
    } else {
      alert('Oyun oluşturulamadı! Lütfen tekrar deneyin.');
      setWaitingForMatch(false);
    }
  };

  const handleBothReady = () => {
    // Her iki oyuncu da hazır, oyunu başlat
    setWaitingForMatch(false);
    
    // Oyun zaten API'de var, sadece startGame'e gameId'yi gönder
    onStartGame(selectedOpponent, {
      gameId: matchGameId,
      isMultiplayer: true,
    });
  };

  const handleJoinTournament = () => {
    alert('Turnuva özelliği yakında eklenecek! 🏆');
  };

  return (
    <div className="game-lobby">
      <UserProfile
        user={currentUser}
        userRank={getUserCurrentRank()}
        getRankIcon={getRankIcon}
        getRankColor={getRankColor}
        calculateWinRate={(user) => calculateWinRate(user.gamesWon, user.gamesPlayed)}
        onLogout={onLogout}
      />

      <div className="lobby-content">
        <div className="match-section">
          <h3>🎮 Oyun Başlat</h3>
          
          {waitingForMatch ? (
            <WaitingMatch 
              selectedOpponent={selectedOpponent}
              currentUser={currentUser}
              gameId={matchGameId}
              onBothReady={handleBothReady}
            />
          ) : (
            <MatchmakingButtons 
              onFindMatch={findRandomMatch}
              onJoinTournament={handleJoinTournament}
            />
          )}

          <OnlineUsers 
            users={onlineUsers}
            getRankIcon={getRankIcon}
            onChallenge={challengeUser}
          />
        </div>

        <Leaderboard 
          leaderboard={leaderboard}
          currentUserId={currentUser.id}
          getRankIcon={getRankIcon}
          getRankColor={getRankColor}
          calculateWinRate={(user) => calculateWinRate(user.gamesWon, user.gamesPlayed)}
        />
      </div>
    </div>
  );
};

export default GameLobby;
