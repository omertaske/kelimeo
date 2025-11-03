import { toUpperTR, toLowerTR, normalizeNFC } from '../../string/locale';

describe('locale Turkish case + NFC', () => {
  it('uppercases i/ı correctly', () => {
    expect(toUpperTR('iı')).toBe('İI');
  });
  it('lowercases I/İ correctly', () => {
    expect(toLowerTR('Iİ')).toBe('ıi');
  });
  it('normalizes NFC', () => {
    // compose a +  ̈  to precomposed ä
    const decomposed = 'a\u0308';
    expect(normalizeNFC(decomposed)).toBe('ä');
  });
});
