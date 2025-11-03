import { isMyTurn } from '../selectors';

describe('selectors.isMyTurn', () => {
  it('returns true when mpMode and ids match', () => {
    expect(isMyTurn(true, 'p1', 'p1', null)).toBe(true);
  });
  it('returns false when mpMode and ids differ', () => {
    expect(isMyTurn(true, 'p2', 'p1', null)).toBe(false);
  });
  it('falls back to single player mode currentTurn', () => {
    expect(isMyTurn(false, null, null, 'player')).toBe(true);
    expect(isMyTurn(false, null, null, 'opponent')).toBe(false);
  });
});
