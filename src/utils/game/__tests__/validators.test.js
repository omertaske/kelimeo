import { validateOrientationAndContiguity } from '../../game/validators';

const empty15 = () => Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => ({ letter: null })));

describe('validateOrientationAndContiguity', () => {
  it('requires at least one tile', () => {
    const res = validateOrientationAndContiguity([], empty15());
    expect(res.ok).toBe(false);
  });

  it('enforces center star on first move', () => {
    const board = empty15();
    const res = validateOrientationAndContiguity([{ row: 0, col: 0, letter: 'A' }], board);
    expect(res.ok).toBe(false);
  });

  it('accepts horizontal contiguous placement including existing bridges', () => {
    const board = empty15();
    // existing at (7,8)
    board[7][8] = { letter: 'A' };
    // placed at (7,7) and (7,9) — contiguous via existing letter
  // first move rule will fail unless center used; simulate not first move by adding anyCommitted
    // add a committed elsewhere
    board[0][0] = { letter: 'B' };
    const res2 = validateOrientationAndContiguity([{ row: 7, col: 7 }, { row: 7, col: 9 }], board);
    expect(res2.ok).toBe(true);
    expect(res2.orientation).toBe('H');
  });
});
