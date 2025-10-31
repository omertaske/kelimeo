import { useState, useCallback } from 'react';

/**
 * Game timer yönetimi için custom hook
 */
export const useGameTimer = (initialTime = 120) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newTime = initialTime) => {
    setTimeLeft(newTime);
    setIsRunning(false);
  }, [initialTime]);

  const tick = useCallback(() => {
    setTimeLeft(prev => Math.max(0, prev - 1));
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 30;

  return {
    timeLeft,
    isRunning,
    isUrgent,
    isWarning,
    formattedTime: formatTime(timeLeft),
    start,
    pause,
    reset,
    tick
  };
};
