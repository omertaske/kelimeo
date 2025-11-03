import { computePreviewBoard } from '../preview';

describe('computePreviewBoard', () => {
  it('applies placed tiles immutably on top of base board', () => {
    const base = [
      [{ letter: null }, { letter: null }],
      [{ letter: null }, { letter: 'A', owner: 'opponent' }],
    ];
    const placed = [{ row: 0, col: 1, letter: 'B', isBlank: false }];
    const next = computePreviewBoard(base, placed);
    expect(next).not.toBe(base);
    expect(next[0][1].letter).toBe('B');
    expect(next[1][1].letter).toBe('A');
    expect(base[0][1].letter).toBe(null);
  });

  it('uses blank repr for blank tiles', () => {
    const base = [[{ letter: null }]];
    const placed = [{ row: 0, col: 0, letter: '*', isBlank: true, repr: 'İ' }];
    const next = computePreviewBoard(base, placed);
    expect(next[0][0].letter).toBe('İ');
    expect(next[0][0].isBlank).toBe(true);
  });
});
