import { toMpTile, fromMpTile } from '../tileAdapter';

describe('DnD tile adapters', () => {
  test('toMpTile promotes string letters', () => {
    const t1 = toMpTile('A');
    expect(t1).toEqual({ id: undefined, letter: 'A', value: undefined, isBlank: false });
    const t2 = toMpTile('*');
    expect(t2).toEqual({ id: undefined, letter: '*', value: 0, isBlank: true });
  });

  test('fromMpTile collapses to letter', () => {
    expect(fromMpTile({ id: 'x', letter: 'B', value: 3, isBlank: false })).toBe('B');
  });
});
