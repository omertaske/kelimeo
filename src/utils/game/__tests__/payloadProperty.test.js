import { tilesToPayload } from '../tileAdapter';

function randInt(n){ return Math.floor(Math.random()*n); }
function randLetter(){
  const letters = ['A','B','C','Ç','D','E','F','G','Ğ','H','I','İ','J','K','L','M','N','O','Ö','P','R','S','Ş','T','U','Ü','V','Y','Z','*'];
  return letters[randInt(letters.length)];
}

describe('tilesToPayload property checks', () => {
  test('blank repr uppercased TR and coords pass-through', () => {
    for (let i=0;i<50;i++){
      const len = 1 + randInt(5);
      const placed = [];
      for (let j=0;j<len;j++){
        const letter = randLetter();
        const isBlank = letter === '*';
        placed.push({
          row: randInt(15), col: randInt(15), letter,
          isBlank,
          repr: isBlank ? (Math.random() < 0.5 ? 'i' : 'a') : undefined,
        });
      }
      const payload = tilesToPayload(placed);
      expect(payload.length).toBe(placed.length);
      payload.forEach((t,k) => {
        expect(t.row).toBe(placed[k].row);
        expect(t.col).toBe(placed[k].col);
        if (placed[k].isBlank) {
          expect(t.isBlank).toBe(true);
          expect(t.letter).toBe((placed[k].repr || '').toUpperCase().replace('I','I').replace('i','İ'));
          expect(t.repr).toBe(t.letter);
        }
      })
    }
  });
});
