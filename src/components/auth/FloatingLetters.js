import React from 'react';

const FloatingLetters = () => {
  const letters = ['S', 'C', 'R', 'A', 'B', 'B', 'L', 'E'];
  
  return (
    <div className="floating-letters">
      {letters.map((letter, index) => (
        <div 
          key={`letter-${letter}-${index}`}
          className="floating-letter"
          style={{ 
            animationDelay: `${index * 0.5}s`,
            left: `${10 + index * 10}%`
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
};

export default FloatingLetters;
