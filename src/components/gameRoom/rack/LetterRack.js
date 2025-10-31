import React from 'react';
import LetterTile from './LetterTile';

const LetterRack = ({ 
  letters, 
  onLetterSelect, 
  draggingLetter, 
  isDraggingRack,
  position,
  onMouseDown,
  isPlayerTurn 
}) => {
  return (
    <div 
      className={`letter-rack ${isDraggingRack ? 'dragging' : ''}`}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        bottom: position.bottom,
        transform: position.bottom !== 'auto' ? 'translateX(-50%)' : 'none',
        cursor: isDraggingRack ? 'grabbing' : 'grab'
      }}
      onMouseDown={onMouseDown}
    >
      <div className="letter-rack-title">
        ✋ Harfleriniz ({letters.length}/7) {draggingLetter ? '- Sürükleniyor...' : isDraggingRack ? '- Taşınıyor...' : ''}
      </div>
      <div className="letter-tiles">
        {letters.map((letter, index) => (
          <LetterTile
            key={`${letter}-${index}`}
            letter={letter}
            onClick={() => onLetterSelect(letter)}
            isSelected={draggingLetter === letter}
            isDisabled={!isPlayerTurn}
          />
        ))}
      </div>
    </div>
  );
};

export default LetterRack;
