import React from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import AppRouter from './components/AppRouter';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <GameProvider>
          <AppRouter />
        </GameProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
