import React, { useEffect, useState, useRef, useCallback } from 'react';
import './Toast.css';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // onClose ref'ini her zaman güncel tut
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const performClose = useCallback(() => {
    if (onCloseRef.current) {
      onCloseRef.current();
    }
  }, []);

  useEffect(() => {
    console.log('🔔 Toast timer başlatılıyor:', { message, duration });
    
    // Önceki timer'ları temizle
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    // Yeni timer başlat
    if (duration > 0 && message) {
      setIsClosing(false); // Reset closing state
      
      timerRef.current = setTimeout(() => {
        console.log('⏰ Toast kapanıyor (animasyon başladı)');
        setIsClosing(true);
        
        // Animasyon tamamlandıktan sonra kapat
        closeTimerRef.current = setTimeout(() => {
          console.log('✅ Toast tamamen kapandı');
          performClose();
        }, 400);
      }, duration);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [message, duration, performClose]);

  const handleClose = () => {
    console.log('👆 Manuel kapatma');
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      performClose();
    }, 400);
  };

  if (!message) return null;

  return (
    <div className={`toast toast-${type} ${isClosing ? 'toast-closing' : ''}`}>
      <div className="toast-content">
        {message}
      </div>
      {onClose && (
        <button className="toast-close" onClick={handleClose}>
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
