import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Components
import Layout from '../components/layout/Layout';
import Auth from '../components/Auth';
import GameLobby from '../components/GameLobby';
import RoomSelector from '../components/rooms/RoomSelector';
import GameRoom from '../components/game/GameRoom';
import LettersPractice from '../components/game/LettersPractice';
import Profile from '../components/layout/Profile';
import MatchmakingScreen from '../components/matchmaking/MatchmakingScreen';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <h2>Yükleniyor...</h2>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

// Public Route Component (sadece giriş yapmamış kullanıcılar için)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <h2>Yükleniyor...</h2>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/rooms" replace />;
};

// Router Configuration
const router = createBrowserRouter([
  {
    path: '/auth',
    element: (
      <PublicRoute>
        <Auth />
      </PublicRoute>
    )
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/lobby" replace />
      },
      {
        path: 'lobby',
        element: <GameLobby />
      },
      {
        path: 'rooms',
        element: <RoomSelector />
      },
      {
        path: 'matchmaking/:roomId',
        element: <MatchmakingScreen />
      },
      {
        path: 'game/:roomId',
        element: <GameRoom />
      },
      {
        path: 'letters',
        element: <LettersPractice />
      },
      {
        path: 'profile',
        element: <Profile />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;