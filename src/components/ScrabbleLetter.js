import React from 'react';
import './ScrabbleLetter.css';
import { toUpperCaseTurkish } from '../helpers/stringHelpers';

const ScrabbleLetter = ({ letter, score, onClick, isSelected = false, disabled = false }) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(letter);
    }
  };

  return (
    <div 
      className={`scrabble-letter ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
    >
      <div className="letter-face">
        <span className="letter-text">{toUpperCaseTurkish(letter)}</span>
        <span className="letter-score">{score}</span>
      </div>
    </div>
  );
};

export default ScrabbleLetter;