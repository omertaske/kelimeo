import { calculateScore } from '../scoreUtils';

function emptyBoard(n=15){
  return Array.from({length:n},()=>Array.from({length:n},()=>({
    letter:null, owner:null, usedMultipliers:false, multiplier:null, isCenter:false
  })));
}

describe('scoreUtils.calculateScore', () => {
  test('computes base score without multipliers', () => {
    const board = emptyBoard();
    const word = 'AB'; // A=1, B=3
    const positions = [{row:7,col:7},{row:7,col:8}];
    const { score, baseScore, multiplier, bingo } = calculateScore(word, positions, board);
    expect(baseScore).toBeGreaterThan(0);
    // base might use LETTER_SCORES; A(1)+B(3)=4
    expect(baseScore).toBe(4);
    expect(multiplier).toBe(1);
    expect(score).toBe(4);
    expect(bingo).toBe(false);
  });

  test('applies letter multiplier (DL/TL) only for new tiles', () => {
    const board = emptyBoard();
    // simulate DL at (0,3) from constants; place word at [0,3] and [0,4]
    const word = 'AA';
    const positions = [{row:0,col:3},{row:0,col:4}];
    const res = calculateScore(word, positions, board);
    expect(res.score).toBeGreaterThan(2);
    expect(res.multiplier).toBe(1);
  });

  test('applies word multiplier (DW/TW) only for new tiles', () => {
    const board = emptyBoard();
    // TW at (0,0), single letter word 'A' placed at 0,0 and next 'A' at 0,1 to make >=2
    const word = 'AA';
    const positions = [{row:0,col:0},{row:0,col:1}];
    const res = calculateScore(word, positions, board);
    expect(res.multiplier).toBeGreaterThanOrEqual(2);
    expect(res.score).toBe(res.baseScore * res.multiplier + (res.bingo?50:0));
  });
});
