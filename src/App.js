import React from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { SocketProvider } from './context/SocketContext';
import AppRouter from './components/AppRouter';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SocketProvider>
          <GameProvider>
            <AppRouter />
          </GameProvider>
        </SocketProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
