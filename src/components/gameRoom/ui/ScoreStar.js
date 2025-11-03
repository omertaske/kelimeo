import React from 'react';

const ScoreStar = ({ lastMovePoints = 0, currentScore = 0 }) => {
  const shown = lastMovePoints > 0 ? lastMovePoints : currentScore;
  if (!shown) return null;
  return (
    <div className="score-star" aria-live="polite" role="status">
      <div className="star-icon">⭐</div>
      <div className="star-score">{shown}</div>
    </div>
  );
};

export default ScoreStar;
