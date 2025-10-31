import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: {
    user: userReducer
  }
});

export const setupStore = (preloadedState) =>
  configureStore({
    reducer: {
      user: userReducer
    },
    preloadedState
  });
