import { useState, useCallback } from 'react';

/**
 * Mesaj gösterimi ve yönetimi için custom hook
 */
export const useGameMessages = (autoHideDuration = 5000) => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error', 'warning'

  const showMessage = useCallback((text, type = 'info', duration = autoHideDuration) => {
    setMessage(text);
    setMessageType(type);

    if (duration > 0) {
      setTimeout(() => {
        setMessage('');
      }, duration);
    }
  }, [autoHideDuration]);

  const showSuccess = useCallback((text) => {
    showMessage(text, 'success');
  }, [showMessage]);

  const showError = useCallback((text) => {
    showMessage(text, 'error');
  }, [showMessage]);

  const showWarning = useCallback((text) => {
    showMessage(text, 'warning');
  }, [showMessage]);

  const showInfo = useCallback((text) => {
    showMessage(text, 'info');
  }, [showMessage]);

  const clearMessage = useCallback(() => {
    setMessage('');
  }, []);

  return {
    message,
    messageType,
    showMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearMessage
  };
};
