import { applyBoardDiffImmutable } from '../tileAdapter';

describe('applyBoardDiffImmutable', () => {
  it('applies diff immutably and preserves usedMultipliers', () => {
    const prev = [
      [{ letter: null, multiplier: 'DL' }, { letter: null }],
      [{ letter: null }, { letter: 'A', usedMultipliers: true }]
    ];
    const diff = [ { row: 0, col: 0, letter: 'B', isBlank: false } ];
    const next = applyBoardDiffImmutable(prev, diff, 'player1');
    expect(next).not.toBe(prev);
    expect(next[0][0].letter).toBe('B');
    expect(next[0][0].usedMultipliers).toBeTruthy();
    // previously used remains used
    expect(next[1][1].usedMultipliers).toBe(true);
  });
});
