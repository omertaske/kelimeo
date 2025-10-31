import React from 'react';
import { LETTER_SCORES } from '../../../constants';

const LetterTile = ({ letter, onClick, isSelected, isDisabled }) => {
  return (
    <div
      className={`letter-tile ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={onClick}
      style={{ cursor: isDisabled ? 'not-allowed' : 'grab' }}
    >
      {letter}
      <span className="letter-tile-score">{LETTER_SCORES[letter] || 0}</span>
    </div>
  );
};

export default LetterTile;
