import React, { useState } from 'react';
import './LetterBagDrawer.css';

const LetterBagDrawer = ({ letterBag }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Harfleri say
  const letterCounts = letterBag.reduce((acc, letter) => {
    acc[letter] = (acc[letter] || 0) + 1;
    return acc;
  }, {});

  // Alfabetik sırala
  const sortedLetters = Object.keys(letterCounts).sort((a, b) => {
    const turkishAlphabet = 'AÂBCÇDEÊFGĞHIİÎJKLMNOÖÔPRSŞTUÜÛVYZ';
    return turkishAlphabet.indexOf(a) - turkishAlphabet.indexOf(b);
  });

  return (
    <>
      {/* Çekmece Butonu */}
      <button 
        className={`drawer-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Torbadaki harfleri gör"
      >
        📦 {letterBag.length}
      </button>

      {/* Çekmece İçeriği */}
      {isOpen && (
        <div className="drawer-overlay" onClick={() => setIsOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>📦 Torbadaki Harfler</h3>
              <button className="drawer-close" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>
            
            <div className="drawer-body">
              <div className="letter-grid">
                {sortedLetters.map(letter => (
                  <div key={letter} className="letter-item">
                    <span className="letter-char">{letter}</span>
                    <span className="letter-amount">×{letterCounts[letter]}</span>
                  </div>
                ))}
              </div>
              
              <div className="drawer-footer">
                <strong>Toplam:</strong> {letterBag.length} harf
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LetterBagDrawer;
