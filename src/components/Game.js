import React, { useState, useEffect } from 'react';
import ScrabbleLetter from './ScrabbleLetter';
import './Game.css';
import { toLowerCaseTurkish } from '../helpers/stringHelpers';

// TDK API import
const TDK = require('tdk-all-api');

const Game = ({ currentUser, opponent, onGameEnd }) => {
  const [gameBoard, setGameBoard] = useState(Array(15).fill(null).map(() => Array(15).fill(null)));
  const [currentPlayerLetters, setCurrentPlayerLetters] = useState([]);
  const [opponentLetters, setOpponentLetters] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(currentUser.id);
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [placedLetters, setPlacedLetters] = useState([]);
  const [gameScore, setGameScore] = useState({
    [currentUser.id]: 0,
    [opponent.id]: 0
  });
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes per turn
  const [gameLog, setGameLog] = useState([]);
  const [isValidatingWord, setIsValidatingWord] = useState(false);
  
  // Scrabble harfleri ve puanları (Türkçe)
  const scrabbleLetters = [
    { letter: 'A', score: 1, count: 12 }, { letter: 'B', score: 3, count: 2 }, 
    { letter: 'C', score: 4, count: 2 }, { letter: 'Ç', score: 4, count: 2 }, 
    { letter: 'D', score: 3, count: 4 }, { letter: 'E', score: 1, count: 12 }, 
    { letter: 'F', score: 7, count: 1 }, { letter: 'G', score: 5, count: 3 }, 
    { letter: 'Ğ', score: 8, count: 1 }, { letter: 'H', score: 5, count: 2 }, 
    { letter: 'I', score: 2, count: 7 }, { letter: 'İ', score: 1, count: 8 }, 
    { letter: 'J', score: 10, count: 1 }, { letter: 'K', score: 1, count: 7 }, 
    { letter: 'L', score: 1, count: 4 }, { letter: 'M', score: 2, count: 3 }, 
    { letter: 'N', score: 1, count: 6 }, { letter: 'O', score: 2, count: 3 }, 
    { letter: 'Ö', score: 7, count: 1 }, { letter: 'P', score: 5, count: 1 }, 
    { letter: 'R', score: 1, count: 6 }, { letter: 'S', score: 2, count: 4 }, 
    { letter: 'Ş', score: 4, count: 2 }, { letter: 'T', score: 1, count: 5 }, 
    { letter: 'U', score: 2, count: 3 }, { letter: 'Ü', score: 3, count: 2 }, 
    { letter: 'V', score: 7, count: 1 }, { letter: 'Y', score: 3, count: 2 }, 
    { letter: 'Z', score: 4, count: 1 }
  ];

  const [letterBag, setLetterBag] = useState([]);

  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && currentTurn === currentUser.id) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      // Time's up, switch turn
      switchTurn();
    }
  }, [timeLeft, currentTurn, currentUser.id]);

  const initializeGame = () => {
    // Create letter bag
    const bag = [];
    scrabbleLetters.forEach(letterData => {
      for (let i = 0; i < letterData.count; i++) {
        bag.push(letterData);
      }
    });
    
    // Shuffle bag
    const shuffledBag = bag.sort(() => Math.random() - 0.5);
    setLetterBag(shuffledBag);
    
    // Deal initial letters
    const playerLetters = shuffledBag.splice(0, 7);
    const oppLetters = shuffledBag.splice(0, 7);
    
    setCurrentPlayerLetters(playerLetters);
    setOpponentLetters(oppLetters);
    setLetterBag(shuffledBag);
    
    // Add game start log
    addToGameLog(`🎯 Oyun başladı! ${currentUser.username} vs ${opponent.username}`);
    addToGameLog(`🎲 ${currentUser.username} başlıyor...`);
  };

  const drawLetters = (count, forPlayer) => {
    if (letterBag.length === 0) return [];
    
    const drawnLetters = letterBag.splice(0, Math.min(count, letterBag.length));
    setLetterBag([...letterBag]);
    
    if (forPlayer === 'current') {
      setCurrentPlayerLetters(prev => [...prev, ...drawnLetters]);
    } else {
      setOpponentLetters(prev => [...prev, ...drawnLetters]);
    }
    
    return drawnLetters;
  };

  const addToGameLog = (message) => {
    setGameLog(prev => [...prev, { 
      message, 
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now()
    }]);
  };

  const validateWordWithTDK = async (word) => {
    try {
      setIsValidatingWord(true);
      
      // TDK API ile kelime kontrolü
      const result = await TDK.sozluk(toLowerCaseTurkish(word));
      
      if (result && result.length > 0) {
        addToGameLog(`✅ "${word}" geçerli bir kelime!`);
        return true;
      } else {
        addToGameLog(`❌ "${word}" geçersiz kelime!`);
        return false;
      }
    } catch (error) {
      console.error('TDK API Error:', error);
      // API hatası durumunda basit kontrol
      if (word.length >= 2) {
        addToGameLog(`⚠️ "${word}" kabul edildi (API hatası)`);
        return true;
      }
      return false;
    } finally {
      setIsValidatingWord(false);
    }
  };

  const calculateWordScore = (word, positions) => {
    let score = 0;
    let wordMultiplier = 1;
    
    word.split('').forEach((letter, index) => {
      const letterData = scrabbleLetters.find(l => l.letter === letter);
      let letterScore = letterData ? letterData.score : 1;
      
      // Check for premium squares
      const pos = positions[index];
      if (pos) {
        const boardCell = gameBoard[pos.row][pos.col];
        if (!boardCell) { // Only apply multipliers for newly placed letters
          // Premium square logic here
          if (isPremiumSquare(pos.row, pos.col, 'DL')) letterScore *= 2;
          if (isPremiumSquare(pos.row, pos.col, 'TL')) letterScore *= 3;
          if (isPremiumSquare(pos.row, pos.col, 'DW')) wordMultiplier *= 2;
          if (isPremiumSquare(pos.row, pos.col, 'TW')) wordMultiplier *= 3;
        }
      }
      
      score += letterScore;
    });
    
    return score * wordMultiplier;
  };

  const isPremiumSquare = (row, col, type) => {
    // Center star
    if (row === 7 && col === 7) return type === 'DW';
    
    // Triple Word Score corners
    if ((row === 0 || row === 14) && (col === 0 || col === 7 || col === 14)) return type === 'TW';
    if ((row === 7) && (col === 0 || col === 14)) return type === 'TW';
    
    // Double Word Score
    if (row === col && (row >= 1 && row <= 4)) return type === 'DW';
    if (row + col === 14 && (row >= 1 && row <= 4)) return type === 'DW';
    
    // Triple Letter Score
    if ((row === 1 || row === 13) && (col === 5 || col === 9)) return type === 'TL';
    if ((row === 5 || row === 9) && (col === 1 || col === 13)) return type === 'TL';
    
    // Double Letter Score
    if ((row === 0 || row === 14) && (col === 3 || col === 11)) return type === 'DL';
    if ((row === 2 || row === 12) && (col === 6 || col === 8)) return type === 'DL';
    
    return false;
  };

  const switchTurn = () => {
    const nextPlayer = currentTurn === currentUser.id ? opponent.id : currentUser.id;
    setCurrentTurn(nextPlayer);
    setTimeLeft(120);
    setSelectedLetters([]);
    setPlacedLetters([]);
    
    if (nextPlayer === currentUser.id) {
      addToGameLog(`🔄 Senin sıran!`);
    } else {
      addToGameLog(`🔄 ${opponent.username} oynuyor...`);
      // Simulate opponent move
      setTimeout(() => simulateOpponentMove(), 2000);
    }
  };

  const simulateOpponentMove = async () => {
    // Simple AI: random word placement
    const randomWord = ['KEDİ', 'MASA', 'KITAP', 'GÜZEL', 'OYUN'][Math.floor(Math.random() * 5)];
    const score = Math.floor(Math.random() * 30) + 10;
    
    setGameScore(prev => ({
      ...prev,
      [opponent.id]: prev[opponent.id] + score
    }));
    
    addToGameLog(`🤖 ${opponent.username} "${randomWord}" kelimesini oynadı (+${score} puan)`);
    
    // Draw new letters for opponent
    const usedCount = Math.min(randomWord.length, opponentLetters.length);
    setOpponentLetters(prev => prev.slice(usedCount));
    drawLetters(usedCount, 'opponent');
    
    setTimeout(() => switchTurn(), 1000);
  };

  const playWord = async () => {
    if (selectedLetters.length < 2) {
      alert('En az 2 harf seçmelisiniz!');
      return;
    }
    
    const word = selectedLetters.join('');
    const isValid = await validateWordWithTDK(word);
    
    if (isValid) {
      const score = calculateWordScore(word, []);
      setGameScore(prev => ({
        ...prev,
        [currentUser.id]: prev[currentUser.id] + score
      }));
      
      // Remove used letters from player's hand
      const newPlayerLetters = [...currentPlayerLetters];
      selectedLetters.forEach(letter => {
        const index = newPlayerLetters.findIndex(l => l.letter === letter);
        if (index !== -1) newPlayerLetters.splice(index, 1);
      });
      setCurrentPlayerLetters(newPlayerLetters);
      
      // Draw new letters
      drawLetters(selectedLetters.length, 'current');
      
      addToGameLog(`🎯 "${word}" kelimesini oynadınız (+${score} puan)`);
      
      // Check for game end
      if (currentPlayerLetters.length === 0 || letterBag.length === 0) {
        endGame();
      } else {
        switchTurn();
      }
    } else {
      addToGameLog(`❌ "${word}" geçersiz kelime, tekrar deneyin!`);
    }
  };

  const endGame = () => {
    const winner = gameScore[currentUser.id] > gameScore[opponent.id] ? currentUser : opponent;
    const finalScore = {
      player: gameScore[currentUser.id],
      opponent: gameScore[opponent.id],
      winner: winner.username
    };
    
    addToGameLog(`🏁 Oyun bitti! Kazanan: ${winner.username}`);
    
    // Update user stats
    updateUserStats(finalScore);
    
    setTimeout(() => {
      onGameEnd(finalScore);
    }, 3000);
  };

  const updateUserStats = (finalScore) => {
    const storedData = localStorage.getItem('scrabbleUsers');
    if (storedData) {
      const data = JSON.parse(storedData);
      const userIndex = data.users.findIndex(u => u.id === currentUser.id);
      
      if (userIndex !== -1) {
        data.users[userIndex].gamesPlayed++;
        data.users[userIndex].totalScore += finalScore.player;
        
        if (finalScore.player > data.users[userIndex].bestScore) {
          data.users[userIndex].bestScore = finalScore.player;
        }
        
        if (finalScore.winner === currentUser.username) {
          data.users[userIndex].wins++;
        } else {
          data.users[userIndex].losses++;
        }
        
        // Update rank based on total score
        if (data.users[userIndex].totalScore >= 2000) {
          data.users[userIndex].rank = 'Şampiyon';
        } else if (data.users[userIndex].totalScore >= 1500) {
          data.users[userIndex].rank = 'Usta';
        } else if (data.users[userIndex].totalScore >= 1000) {
          data.users[userIndex].rank = 'Uzman';
        } else if (data.users[userIndex].totalScore >= 500) {
          data.users[userIndex].rank = 'İleri';
        } else if (data.users[userIndex].totalScore >= 200) {
          data.users[userIndex].rank = 'Orta';
        } else {
          data.users[userIndex].rank = 'Başlangıç';
        }
        
        localStorage.setItem('scrabbleUsers', JSON.stringify(data));
        localStorage.setItem('currentScrabbleUser', JSON.stringify(data.users[userIndex]));
      }
    }
  };

  const handleLetterClick = (letter) => {
    if (currentTurn !== currentUser.id) return;
    
    setSelectedLetters(prev => [...prev, letter]);
  };

  const clearSelectedLetters = () => {
    setSelectedLetters([]);
  };

  const skipTurn = () => {
    addToGameLog(`⏭️ ${currentUser.username} sırasını geçti`);
    switchTurn();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="game-container">
      {/* Game Header */}
      <div className="game-header">
        <div className="player-info">
          <div className={`player ${currentTurn === currentUser.id ? 'active' : ''}`}>
            <span className="player-name">🎯 {currentUser.username}</span>
            <span className="player-score">{gameScore[currentUser.id]} puan</span>
          </div>
          <div className="vs">VS</div>
          <div className={`player ${currentTurn === opponent.id ? 'active' : ''}`}>
            <span className="player-name">🤖 {opponent.username}</span>
            <span className="player-score">{gameScore[opponent.id]} puan</span>
          </div>
        </div>
        
        <div className="game-status">
          <div className="timer">
            ⏰ {formatTime(timeLeft)}
          </div>
          <div className="turn-indicator">
            {currentTurn === currentUser.id ? 'Senin Sıran' : `${opponent.username} Oynuyor`}
          </div>
        </div>
      </div>

      <div className="game-content">
        {/* Player Letters */}
        <div className="player-letters-section">
          <h3>📝 Harfleriniz ({currentPlayerLetters.length}/7)</h3>
          <div className="player-letters">
            {currentPlayerLetters.map((letterObj, index) => (
              <ScrabbleLetter
                key={index}
                letter={letterObj.letter}
                score={letterObj.score}
                onClick={currentTurn === currentUser.id ? handleLetterClick : null}
              />
            ))}
          </div>
          
          {/* Selected Letters */}
          {selectedLetters.length > 0 && (
            <div className="selected-section">
              <h4>🔤 Seçilen Kelime:</h4>
              <div className="selected-word-display">
                <span className="word">{selectedLetters.join('')}</span>
                <span className="score">
                  (+{calculateWordScore(selectedLetters.join(''), [])} puan)
                </span>
              </div>
              
              <div className="action-buttons">
                <button 
                  className="play-btn" 
                  onClick={playWord}
                  disabled={isValidatingWord || currentTurn !== currentUser.id}
                >
                  {isValidatingWord ? '🔍 Kontrol Ediliyor...' : '✅ Kelimeyi Oyna'}
                </button>
                <button className="clear-btn" onClick={clearSelectedLetters}>
                  🗑️ Temizle
                </button>
                <button className="skip-btn" onClick={skipTurn}>
                  ⏭️ Sırayı Geç
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Game Log */}
        <div className="game-log-section">
          <h3>📜 Oyun Geçmişi</h3>
          <div className="game-log">
            {gameLog.slice(-10).map(log => (
              <div key={log.id} className="log-entry">
                <span className="timestamp">{log.timestamp}</span>
                <span className="message">{log.message}</span>
              </div>
            ))}
          </div>
          
          {/* Letter Bag Info */}
          <div className="game-info">
            <div className="info-item">
              <span className="label">🎒 Kalan Harf:</span>
              <span className="value">{letterBag.length}</span>
            </div>
            <div className="info-item">
              <span className="label">🎯 Rakip Harf:</span>
              <span className="value">{opponentLetters.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;