import React, { useState } from 'react';
import './BagDrawer.css';

/**
 * TEK ORTAK TILE BAG — Torba İçeriği Görüntüleyici
 * Global tileBag'in snapshot'ını kullanarak torbadaki harfleri gösterir
 */
const BagDrawer = ({ tileBagSnapshot }) => {
  const [isOpen, setIsOpen] = useState(false);

  // TEK ORTAK TILE BAG — Snapshot'tan harf frekanslarını al
  const getLetterFrequency = () => {
    if (!tileBagSnapshot) return [];
    
    const frequency = [];
    
    Object.values(tileBagSnapshot).forEach(tile => {
      if (tile.remaining > 0) {
        frequency.push({
          letter: tile.letter,
          count: tile.remaining,
          value: tile.value
        });
      }
    });
    
    // Harfleri alfabetik sırala
    return frequency.sort((a, b) => a.letter.localeCompare(b.letter, 'tr'));
  };

  const letterFrequency = getLetterFrequency();
  
  // TEK ORTAK TILE BAG — Toplam kalan taş sayısı
  const totalLetters = letterFrequency.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={`bag-drawer ${isOpen ? 'open' : 'closed'}`}>
      <button 
        className="drawer-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Torba detayları"
      >
        <span className="toggle-icon">{isOpen ? '✕' : '🎒'}</span>
        <span className="toggle-text">
          {isOpen ? 'Kapat' : `Torba (${totalLetters})`}
        </span>
      </button>

      {isOpen && (
        <div className="drawer-content">
          <div className="drawer-header">
            <h3>🎒 Torbadaki Harfler</h3>
            <p className="total-count">Toplam: <strong>{totalLetters}</strong> harf</p>
          </div>
          
          <div className="letters-grid">
            {letterFrequency.map((item) => (
              <div key={item.letter} className="letter-item">
                <div className="letter-display">
                  <span className="letter">{item.letter}</span>
                  <span className="letter-score">{item.value}</span>
                </div>
                <div className="letter-count">
                  <span className="count-badge">{item.count}</span>
                  <span className="count-label">adet</span>
                </div>
              </div>
            ))}
          </div>

          {totalLetters === 0 && (
            <div className="empty-bag">
              <span className="empty-icon">📭</span>
              <p>Torba boş!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BagDrawer;
