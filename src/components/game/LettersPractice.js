import React, { useState } from 'react';
import ScrabbleLetter from '../ScrabbleLetter';
import './LettersPractice.css';

const LettersPractice = () => {
  const [selectedLetters, setSelectedLetters] = useState([]);

  // Türkçe Scrabble harfleri ve puanları
  const scrabbleLetters = [
    { letter: 'A', score: 1 }, { letter: 'B', score: 3 }, { letter: 'C', score: 4 }, 
    { letter: 'Ç', score: 4 }, { letter: 'D', score: 3 }, { letter: 'E', score: 1 }, 
    { letter: 'F', score: 7 }, { letter: 'G', score: 5 }, { letter: 'Ğ', score: 8 }, 
    { letter: 'H', score: 5 }, { letter: 'I', score: 2 }, { letter: 'İ', score: 1 }, 
    { letter: 'J', score: 10 }, { letter: 'K', score: 1 }, { letter: 'L', score: 1 }, 
    { letter: 'M', score: 2 }, { letter: 'N', score: 1 }, { letter: 'O', score: 2 }, 
    { letter: 'Ö', score: 7 }, { letter: 'P', score: 5 }, { letter: 'R', score: 1 }, 
    { letter: 'S', score: 2 }, { letter: 'Ş', score: 4 }, { letter: 'T', score: 1 }, 
    { letter: 'U', score: 2 }, { letter: 'Ü', score: 3 }, { letter: 'V', score: 7 }, 
    { letter: 'Y', score: 3 }, { letter: 'Z', score: 4 }
  ];

  const handleLetterClick = (letter) => {
    setSelectedLetters(prev => [...prev, letter]);
  };

  const clearSelectedLetters = () => {
    setSelectedLetters([]);
  };

  const getSelectedWord = () => {
    return selectedLetters.join('');
  };

  const getTotalScore = () => {
    return selectedLetters.reduce((total, letter) => {
      const letterObj = scrabbleLetters.find(l => l.letter === letter);
      return total + (letterObj ? letterObj.score : 0);
    }, 0);
  };

  const removeLastLetter = () => {
    setSelectedLetters(prev => prev.slice(0, -1));
  };

  const getLetterFrequency = (letter) => {
    const frequencies = {
      'A': 12, 'B': 2, 'C': 2, 'Ç': 2, 'D': 3, 'E': 8, 'F': 1,
      'G': 2, 'Ğ': 1, 'H': 2, 'I': 4, 'İ': 7, 'J': 1, 'K': 7,
      'L': 4, 'M': 3, 'N': 6, 'O': 3, 'Ö': 1, 'P': 1, 'R': 6,
      'S': 3, 'Ş': 2, 'T': 5, 'U': 3, 'Ü': 2, 'V': 1, 'Y': 2, 'Z': 2
    };
    return frequencies[letter] || 1;
  };

  const getLetterDifficulty = (score) => {
    if (score <= 2) return 'Kolay';
    if (score <= 5) return 'Orta';
    if (score <= 7) return 'Zor';
    return 'Çok Zor';
  };

  const getDifficultyColor = (score) => {
    if (score <= 2) return '#27ae60';
    if (score <= 5) return '#f39c12';
    if (score <= 7) return '#e67e22';
    return '#e74c3c';
  };

  return (
    <div className="letters-practice">
      <div className="practice-header">
        <h1 className="practice-title">
          🔤 Harf Çalışması
          <span className="practice-subtitle">Türkçe Scrabble harflerini keşfedin!</span>
        </h1>
        
        <div className="practice-stats">
          <div className="stat-card">
            <span className="stat-icon">📝</span>
            <span className="stat-value">{scrabbleLetters.length}</span>
            <span className="stat-label">Toplam Harf</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <span className="stat-value">
              {scrabbleLetters.reduce((total, letter) => total + letter.score, 0)}
            </span>
            <span className="stat-label">Toplam Puan</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <span className="stat-value">
              {Math.max(...scrabbleLetters.map(l => l.score))}
            </span>
            <span className="stat-label">En Yüksek</span>
          </div>
        </div>
      </div>

      <div className="letters-grid-container">
        <h2 className="section-title">🎲 Türkçe Scrabble Harfleri</h2>
        <div className="letters-grid">
          {scrabbleLetters.map((letterObj, index) => (
            <div key={index} className="letter-card">
              <ScrabbleLetter
                letter={letterObj.letter}
                score={letterObj.score}
                onClick={() => handleLetterClick(letterObj.letter)}
              />
              <div className="letter-info">
                <div className="letter-stats">
                  <span className="frequency">
                    📊 {getLetterFrequency(letterObj.letter)} adet
                  </span>
                  <span 
                    className="difficulty"
                    style={{ color: getDifficultyColor(letterObj.score) }}
                  >
                    {getLetterDifficulty(letterObj.score)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedLetters.length > 0 && (
        <div className="selected-section">
          <div className="selected-container">
            <h3 className="selected-title">🔤 Seçilen Harfler</h3>
            
            <div className="selected-letters">
              {selectedLetters.map((letter, index) => {
                const letterObj = scrabbleLetters.find(l => l.letter === letter);
                return (
                  <ScrabbleLetter
                    key={`selected-${index}`}
                    letter={letter}
                    score={letterObj ? letterObj.score : 0}
                  />
                );
              })}
            </div>

            <div className="word-display">
              <div className="word-section">
                <h4>📖 Oluşan Kelime:</h4>
                <div className="word-text">{getSelectedWord()}</div>
              </div>
              
              <div className="score-section">
                <h4>⭐ Toplam Puan:</h4>
                <div className="score-text">{getTotalScore()}</div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="remove-button" onClick={removeLastLetter}>
                ⬅️ Son Harfi Sil
              </button>
              <button className="clear-button" onClick={clearSelectedLetters}>
                🗑️ Tümünü Temizle
              </button>
            </div>

            <div className="letter-breakdown">
              <h4>📊 Harf Analizi:</h4>
              <div className="breakdown-grid">
                {selectedLetters.map((letter, index) => {
                  const letterObj = scrabbleLetters.find(l => l.letter === letter);
                  return (
                    <div key={`breakdown-${index}`} className="breakdown-item">
                      <span className="breakdown-letter">{letter}</span>
                      <span className="breakdown-score">{letterObj?.score || 0} puan</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tips-section">
        <h3 className="tips-title">💡 Scrabble İpuçları</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <h4>Yüksek Puanlı Harfler</h4>
            <p>J (10), Ğ (8), F, Ö, V (7) gibi harfler çok değerlidir. Bunları stratejik olarak kullanın!</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">🔤</div>
            <h4>Harf Sıklığı</h4>
            <p>A (12), İ (7), K (7) gibi harfler daha sık çıkar. Kelime kurarken bunları göz önünde bulundurun.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">⚡</div>
            <h4>Hızlı Kelimeler</h4>
            <p>Kısa ama etkili kelimeler (İT, EL, AT gibi) hızlı puan kazanmak için idealdir.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">🏆</div>
            <h4>Çoklu Kelimeler</h4>
            <p>Mevcut kelimelere harf ekleyerek aynı anda birden fazla kelime oluşturabilirsiniz.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LettersPractice;