import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import GameLobbyContainer from './lobby/GameLobbyContainer';

const GameLobby = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { startGame } = useGame();

  const handleStartGame = (opponent, options) => {
    // Multiplayer oyunu başlat
    startGame(opponent, options);
    // GameRoom'a yönlendir
    navigate(`/game/${options.boardId || 'room_1'}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <GameLobbyContainer
      currentUser={currentUser}
      onStartGame={handleStartGame}
      onLogout={handleLogout}
    />
  );
};

export default GameLobby;
