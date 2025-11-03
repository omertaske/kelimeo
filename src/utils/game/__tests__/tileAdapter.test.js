import { tilesToPayload } from '../../game/tileAdapter';

describe('tilesToPayload', () => {
  it('converts normal letters', () => {
    const placed = [{ row: 7, col: 7, letter: 'A', isBlank: false }];
    const payload = tilesToPayload(placed);
    expect(payload).toEqual([{ row: 7, col: 7, letter: 'A', isBlank: false }]);
    expect(payload[0].repr).toBeUndefined();
  });

  it('normalizes blank repr to upper TR NFC', () => {
    const placed = [{ row: 7, col: 7, letter: '*', isBlank: true, repr: 'i' }];
    const payload = tilesToPayload(placed);
    expect(payload[0].isBlank).toBe(true);
    expect(payload[0].letter).toBe('İ');
    expect(payload[0].repr).toBe('İ');
  });
});
