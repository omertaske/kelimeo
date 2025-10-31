import React, { createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  initializeUsers,
  loginUser,
  registerUser,
  logoutUser,
  updateUserStats,
  startMatchmaking,
  selectCurrentUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectUsers,
  selectBots
} from '../store/userSlice';
import { sanitizeUser } from '../models/userModel';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const users = useSelector(selectUsers);
  const bots = useSelector(selectBots);

  useEffect(() => {
    dispatch(initializeUsers());
  }, [dispatch]);

  const login = useCallback(
    (identifier, password) => dispatch(loginUser({ identifier, password })),
    [dispatch]
  );

  const register = useCallback(
    (payload) => dispatch(registerUser(payload)),
    [dispatch]
  );

  const logout = useCallback(
    () => dispatch(logoutUser()),
    [dispatch]
  );

  const updateStats = useCallback(
    (stats) => dispatch(updateUserStats(stats)),
    [dispatch]
  );

  const refreshUsers = useCallback(
    () => dispatch(initializeUsers()),
    [dispatch]
  );

  const startMatch = useCallback(
    (options) => dispatch(startMatchmaking(options)),
    [dispatch]
  );

  const safeUsers = useMemo(() => users.map((user) => sanitizeUser(user)), [users]);
  const safeBots = useMemo(() => bots.map((bot) => sanitizeUser(bot)), [bots]);

  const value = useMemo(() => ({
    currentUser,
    isAuthenticated,
    loading,
    error,
    users: safeUsers,
    bots: safeBots,
    login,
    register,
    logout,
    updateUserStats: updateStats,
    refreshUsers,
    startMatch
  }), [
    currentUser,
    isAuthenticated,
    loading,
    error,
    safeUsers,
    safeBots,
    login,
    register,
    logout,
    updateStats,
    refreshUsers,
    startMatch
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
