import React from 'react';
import './BlankLetterModal.css';

const TURKISH_LETTERS = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H',
  'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P',
  'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
];

const BlankLetterModal = ({ onSelect, onCancel }) => {
  return (
    <div className="blank-modal-overlay" onClick={onCancel}>
      <div className="blank-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="blank-modal-title">🃏 Joker Harf Seçin</h3>
        <p className="blank-modal-desc">Bu joker hangi harfi temsil etsin?</p>
        
        <div className="blank-letter-grid">
          {TURKISH_LETTERS.map(letter => (
            <button
              key={letter}
              className="blank-letter-btn"
              onClick={() => onSelect(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
        
        <button className="blank-cancel-btn" onClick={onCancel}>
          ❌ İptal
        </button>
      </div>
    </div>
  );
};

export default BlankLetterModal;
