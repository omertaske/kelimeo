import React from 'react';
import BoardCell from './BoardCell';

const GameBoard = ({ 
  board, 
  size, 
  onCellClick, 
  placedTiles, 
  lastMove, 
  draggingLetter 
}) => {
  const isPlaced = (row, col) => {
    return placedTiles.some(t => t.row === row && t.col === col);
  };

  const isLastMove = (row, col) => {
    return lastMove && lastMove.positions.some(p => p.row === row && p.col === col);
  };

  const getDisplayLetter = (row, col) => {
    const placedTile = placedTiles.find(t => t.row === row && t.col === col);
    return placedTile ? placedTile.letter : board[row][col].letter;
  };

  return (
    <div 
      className="game-board" 
      style={{ 
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`
      }}
    >
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const displayLetter = getDisplayLetter(rowIndex, colIndex);
          const cellWithLetter = displayLetter ? { ...cell, letter: displayLetter } : cell;
          
          return (
            <BoardCell
              key={`${rowIndex}-${colIndex}`}
              cell={cellWithLetter}
              row={rowIndex}
              col={colIndex}
              onClick={onCellClick}
              isPlaced={isPlaced(rowIndex, colIndex)}
              isLastMove={isLastMove(rowIndex, colIndex)}
              draggingLetter={draggingLetter}
            />
          );
        })
      )}
    </div>
  );
};

export default GameBoard;
