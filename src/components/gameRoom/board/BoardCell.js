import React from 'react';
import { LETTER_SCORES } from '../../../constants';

const BoardCell = ({ cell, row, col, onClick, isPremiumSquare, isPlaced, isLastMove, draggingLetter }) => {
  const getCellClasses = () => {
    let classes = ['board-cell'];
    
    if (cell.multiplier) {
      classes.push(cell.multiplier);
    }
    
    if (cell.isCenter && !cell.letter) {
      classes.push('center-cell');
    }
    
    if (cell.letter) {
      classes.push('filled');
      if (cell.owner === 'player') classes.push('player-tile');
      else if (cell.owner === 'opponent') classes.push('opponent-tile');
    }
    
    if (isPlaced) {
      classes.push('placed');
    }
    
    if (isLastMove) {
      classes.push('last-move-highlight');
    }
    
    return classes.join(' ');
  };

  const getCellContent = () => {
    if (cell.letter) {
      return (
        <>
          <span className="cell-letter">{cell.letter}</span>
          <span className="cell-score">{LETTER_SCORES[cell.letter] || 0}</span>
        </>
      );
    }
    
    if (cell.isCenter) {
      return <span className="center-star">⭐</span>;
    }
    
    if (cell.multiplier) {
      return <span className="cell-multiplier">{cell.multiplier}</span>;
    }
    
    return null;
  };

  return (
    <div
      className={getCellClasses()}
      onClick={() => onClick(row, col)}
      title={cell.multiplier || ''}
      style={{ cursor: draggingLetter ? 'crosshair' : 'pointer' }}
    >
      {getCellContent()}
    </div>
  );
};

export default BoardCell;
