import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import './RoomSelector.css';

const RoomSelector = () => {
  const navigate = useNavigate();
  const { BOARD_TYPES, gameState, GAME_STATES } = useGame();
  const { currentUser } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const joinRef = useRef(null);
  const sliderRef = useRef(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [prevTranslate, setPrevTranslate] = useState(0);

  const selectedBoard = selectedRoom ? Object.values(BOARD_TYPES).find(b => b.id === selectedRoom) : null;
  
  const roomsArray = Object.values(BOARD_TYPES);
  const roomsPerSlide = 3;
  const totalSlides = Math.ceil(roomsArray.length / roomsPerSlide);

  // Slider functions
  const getPositionX = (event) => {
    return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
  };

  const touchStart = (index) => (event) => {
    setCurrentSlideIndex(index);
    setStartPos(getPositionX(event));
    setIsDragging(true);
    sliderRef.current.style.cursor = 'grabbing';
  };

  const touchMove = (event) => {
    if (isDragging) {
      const currentPosition = getPositionX(event);
      setCurrentTranslate(prevTranslate + currentPosition - startPos);
    }
  };

  const touchEnd = () => {
    setIsDragging(false);
    const movedBy = currentTranslate - prevTranslate;

    if (movedBy < -100 && currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }

    if (movedBy > 100 && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }

    setTransition();
    sliderRef.current.style.cursor = 'grab';
  };

  const setTransition = () => {
    const offset = currentSlideIndex * -100;
    setCurrentTranslate(offset);
    setPrevTranslate(offset);
  };

  useEffect(() => {
    setTransition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideIndex]);

  const nextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  useEffect(() => {
    // Simüle edilmiş online kullanıcılar - artık gerekli değil
  }, []);

  const handleRoomSelect = (boardType) => {
    setSelectedRoom(boardType);
  };

  // smooth scroll to join section when a room is selected
  useEffect(() => {
    if (!selectedRoom || !joinRef.current) return;
    try {
      joinRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // focus the join button for accessibility
      const btn = joinRef.current.querySelector('.join-button');
      if (btn) btn.focus({ preventScroll: true });
    } catch (e) {
      // ignore scroll errors
    }
  }, [selectedRoom]);

  const handleJoinRoom = () => {
    if (!selectedRoom) return;

    // Navigate to matchmaking screen (socket-based matching)
    navigate(`/matchmaking/${selectedRoom}`);
  };

  if (gameState === GAME_STATES.MATCHING) {
    return (
      <div className="room-selector matching-state">
        <div className="matching-container">
          <div className="matching-animation">
            <div className="spinner"></div>
            <h2>🔍 Rakip Arıyor...</h2>
            <p>Yakında bir rakip bulunacak!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room-selector">
      <div className="room-header">
        <h1 className="page-title">
          🏠 Oyun Odaları
          <span className="subtitle">Bir tahta türü seçin ve rakiplerinizle yarışın!</span>
        </h1>
        
        <div className="user-welcome">
          <h2>Hoş geldin, <span className="highlight">{currentUser?.username}</span>! 👋</h2>
          <div className="user-quick-stats">
            <div className="stat-item">
              <span className="stat-icon">🎮</span>
              <span className="stat-value">{currentUser?.gamesPlayed || 0}</span>
              <span className="stat-label">Oyun</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <span className="stat-value">{currentUser?.gamesWon || 0}</span>
              <span className="stat-label">Galibiyet</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💔</span>
              <span className="stat-value">{currentUser?.losses || 0}</span>
              <span className="stat-label">Mağlubiyet</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">{currentUser?.bestScore || 0}</span>
              <span className="stat-label">En İyi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Room Slider */}
      <div className="rooms-slider-container">
        <button 
          className="slider-nav prev" 
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          style={{ opacity: currentSlideIndex === 0 ? 0.3 : 1 }}
        >
          ◀
        </button>

        <div 
          className="rooms-slider"
          ref={sliderRef}
          onMouseDown={touchStart(currentSlideIndex)}
          onMouseMove={touchMove}
          onMouseUp={touchEnd}
          onMouseLeave={touchEnd}
          onTouchStart={touchStart(currentSlideIndex)}
          onTouchMove={touchMove}
          onTouchEnd={touchEnd}
          style={{
            transform: `translateX(${currentTranslate}%)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            cursor: 'grab'
          }}
        >
          {roomsArray.map((room) => (
            <div 
              key={room.id}
              className={`room-card ${selectedRoom === room.id ? 'selected' : ''}`}
              onClick={() => handleRoomSelect(room.id)}
              style={{ borderColor: room.color }}
            >
              <div className="room-header-card">
                <div className="room-icon" style={{ fontSize: '3rem' }}>
                  {room.icon}
                </div>
                <h3 className="room-name">{room.name}</h3>
                <p className="room-description">{room.description}</p>
                <div className="room-rank-badge" style={{ backgroundColor: room.color }}>
                  {room.rank}
                </div>
              </div>

              <div className="room-stats">
                <div className="stat-row">
                  <span className="stat-label">🎯 Zorluk:</span>
                  <span className="stat-value">{room.difficulty.replace('_', ' ')}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🤖 Bot Seviyesi:</span>
                  <span className="stat-value">{room.botLevel}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">⏰ Süre Limiti:</span>
                  <span className="stat-value">{room.timeLimit}s</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">📊 Min. Puan:</span>
                  <span className="stat-value">{room.minRankRequired}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">📐 Tahta:</span>
                  <span className="stat-value">{room.boardSize}x{room.boardSize} Yıldız ⭐</span>
                </div>
              </div>

              <div className="room-actions">
                <button 
                  className={`select-button ${selectedRoom === room.id ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoomSelect(room.id);
                  }}
                  style={{ 
                    backgroundColor: selectedRoom === room.id ? room.color : '',
                    borderColor: room.color
                  }}
                >
                  {selectedRoom === room.id ? '✅ Seçildi' : '🎯 Seç'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          className="slider-nav next" 
          onClick={nextSlide}
          disabled={currentSlideIndex === totalSlides - 1}
          style={{ opacity: currentSlideIndex === totalSlides - 1 ? 0.3 : 1 }}
        >
          ▶
        </button>
      </div>

      {/* Slider Indicators */}
      <div className="slider-indicators">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <div 
            key={index}
            className={`indicator ${index === currentSlideIndex ? 'active' : ''}`}
            onClick={() => setCurrentSlideIndex(index)}
          />
        ))}
      </div>

  <div className="join-section" ref={joinRef}>
        <div className="join-info">
          {selectedRoom ? (
            <div className="selected-room-info">
              <h3>
                {selectedBoard?.icon} 
                  {selectedBoard?.name} seçildi!
                </h3>
                <p>{selectedBoard?.description}</p>
              <div className="room-features">
                <span className="feature">
                    👥 Max {selectedBoard?.maxPlayers} Oyuncu
                </span>
                <span className="feature">
                    ⏰ {selectedBoard?.timeLimit} Saniye
                </span>
                <span className="feature">
                    📐 {selectedBoard?.boardSize}x{selectedBoard?.boardSize}
                </span>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <h3>🎯 Bir oda seçin</h3>
              <p>Yukarıdan bir tahta türü seçerek oyuna başlayabilirsiniz!</p>
            </div>
          )}
        </div>

        <button 
          className="join-button"
          onClick={handleJoinRoom}
          disabled={!selectedRoom}
        >
          {selectedRoom ? (
            <>
              🚀 {selectedBoard?.name} Odasına Katıl
            </>
          ) : (
            'Önce bir oda seçin'
          )}
        </button>
      </div>
    </div>
  );
};

export default RoomSelector;