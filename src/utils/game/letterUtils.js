import { LETTER_DISTRIBUTION } from '../../constants';

/**
 * Harf torbasını oluştur ve karıştır
 * @returns {Array} - Karıştırılmış harf dizisi
 */
export const createLetterBag = () => {
  const bag = [];
  
  LETTER_DISTRIBUTION.forEach(letterData => {
    for (let i = 0; i < letterData.count; i++) {
      bag.push(letterData.letter);
    }
  });
  
  return shuffleArray(bag);
};

/**
 * Diziyi karıştır (Fisher-Yates algoritması)
 * @param {Array} array - Karıştırılacak dizi
 * @returns {Array} - Karıştırılmış dizi
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Torbadan rastgele harf çek
 * @param {Array} bag - Harf torbası
 * @param {number} count - Çekilecek harf sayısı
 * @returns {Object} - {drawnLetters, remainingBag}
 */
export const drawLetters = (bag, count) => {
  if (!bag || bag.length === 0) {
    return { drawnLetters: [], remainingBag: [] };
  }
  
  const drawCount = Math.min(count, bag.length);
  const drawnLetters = bag.slice(0, drawCount);
  const remainingBag = bag.slice(drawCount);
  
  return { drawnLetters, remainingBag };
};

/**
 * Oyuncuya başlangıç harfleri ver
 * @param {Array} bag - Harf torbası
 * @param {number} count - Verilecek harf sayısı (varsayılan 7)
 * @returns {Object} - {playerLetters, remainingBag}
 */
export const dealInitialLetters = (bag, count = 7) => {
  return drawLetters(bag, count);
};

/**
 * Harfleri değiştir (Exchange)
 * @param {Array} currentLetters - Mevcut harfler
 * @param {Array} lettersToExchange - Değiştirilecek harfler
 * @param {Array} bag - Harf torbası
 * @returns {Object} - {newLetters, newBag, error}
 */
export const exchangeLetters = (currentLetters, lettersToExchange, bag) => {
  // Resmi kural: Çantada en az 7 taş kalmışsa değiş tokuş yapılabilir
  if (bag.length < 7) {
    return { error: 'Çantada en az 7 harf olmalıdır!' };
  }
  
  if (bag.length < lettersToExchange.length) {
    return { error: 'Yeterli harf yok!' };
  }
  
  // Değiştirilmeyecek harfleri al
  const keptLetters = currentLetters.filter(l => !lettersToExchange.includes(l));
  
  // Torbadan yeni harf çek
  const { drawnLetters, remainingBag } = drawLetters(bag, lettersToExchange.length);
  
  // Değiştirilen harfleri torbaya geri koy ve karıştır
  const updatedBag = shuffleArray([...remainingBag, ...lettersToExchange]);
  
  return {
    newLetters: [...keptLetters, ...drawnLetters],
    newBag: updatedBag
  };
};

/**
 * Torbada kalan harf sayısını kontrol et
 * @param {Array} bag - Harf torbası
 * @returns {number} - Kalan harf sayısı
 */
export const getRemainingLetterCount = (bag) => {
  return bag ? bag.length : 0;
};
