import React from 'react';
import { LETTER_SCORES } from '../../../constants';

const DraggingLetter = ({ letter, position }) => {
  if (!letter) return null;

  return (
    <div 
      className="letter-tile dragging"
      style={{
        left: `${position.x - 25}px`,
        top: `${position.y - 25}px`
      }}
    >
      {letter}
      <span className="letter-tile-score">{LETTER_SCORES[letter] || 0}</span>
    </div>
  );
};

export default DraggingLetter;
