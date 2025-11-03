import { tilesToPayload } from '../tileAdapter';

describe('tilesToPayload', () => {
  it('normalizes coords and blank repr to uppercase TR', () => {
    const placed = [
      { row: 1, col: 2, letter: 'A', isBlank: false },
      { row: 0, col: 0, letter: '*', isBlank: true, repr: 'i' },
    ];
    const payload = tilesToPayload(placed);
    expect(payload[0]).toEqual({ row: 1, col: 2, letter: 'A', isBlank: false, repr: undefined });
    expect(payload[1].row).toBe(0);
    expect(payload[1].col).toBe(0);
    expect(payload[1].isBlank).toBe(true);
    expect(payload[1].repr).toBe('İ');
    expect(payload[1].letter).toBe('İ');
  });
});
