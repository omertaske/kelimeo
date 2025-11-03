import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScoreStar from '../ScoreStar';

describe('ScoreStar', () => {
  it('renders nothing when scores are zero', () => {
    const { container } = render(<ScoreStar lastMovePoints={0} currentScore={0} />);
    expect(container.firstChild).toBeNull();
  });
  it('shows lastMovePoints when present', () => {
    render(<ScoreStar lastMovePoints={12} currentScore={0} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });
  it('falls back to currentScore', () => {
    render(<ScoreStar lastMovePoints={0} currentScore={8} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
