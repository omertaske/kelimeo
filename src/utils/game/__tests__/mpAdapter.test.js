import { getMpStateFromUiState, getUiStateFromMpState } from '../mpAdapter';

describe('mpAdapter', () => {
  it('round-trips board and rack', () => {
    const ui = {
      board: [
        [{ letter: 'A', multiplier: 'DL', isCenter: false }, { letter: null }],
        [{ letter: null }, { letter: 'B', isBlank: false }]
      ],
      rack: ['A', 'B', '*']
    };
    const mp = getMpStateFromUiState(ui);
    const ui2 = getUiStateFromMpState({ board: mp.mpBoard, rack: mp.mpRack });
    expect(ui2.uiRack).toEqual(ui.rack);
    expect(ui2.uiBoard[0][0].letter).toBe('A');
    expect(ui2.uiBoard[0][0].multiplier).toBe('DL');
  });
});
