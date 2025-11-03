import { uiToServerCoords, serverToUiCoords, normalizeCoordsList } from '../coords';

describe('coords utils', () => {
  it('passes through coords when already 0-based', () => {
    const c = uiToServerCoords({ row: 7, col: 7 });
    expect(c).toEqual({ row: 7, col: 7 });
    const ui = serverToUiCoords(c);
    expect(ui).toEqual({ row: 7, col: 7 });
  });

  it('normalizes list', () => {
    const list = normalizeCoordsList([{ row: 0, col: 0 }, { row: 14, col: 14 }]);
    expect(list.length).toBe(2);
    expect(list[1].col).toBe(14);
  });
});
