import { LETTER_SCORES, PREMIUM_POSITIONS, BONUS_SCORES } from '../../constants';

/**
 * Kelime puanını hesapla
 * @param {string} word - Kelime
 * @param {Array} positions - Harflerin tahta üzerindeki pozisyonları [{row, col}]
 * @param {Array} board - Oyun tahtası
 * @returns {Object} - {score, baseScore, multiplier, bonuses, bingo}
 */
export const calculateScore = (word, positions, board) => {
  let baseScore = 0;
  let wordMultiplier = 1;
  const bonuses = [];

  positions.forEach((pos, index) => {
    const letter = word[index];
    let letterScore = LETTER_SCORES[letter] || 1;
    let letterMultiplier = 1;

    // Premium kareleri kontrol et
    Object.entries(PREMIUM_POSITIONS).forEach(([type, posList]) => {
      if (posList.some(([r, c]) => r === pos.row && c === pos.col)) {
        const cell = board?.[pos.row]?.[pos.col];
        
        // Premium kare SADECE boş ise veya bu turda yerleştirildiyse bonus ver
        // Eğer hücrede zaten harf varsa (letter !== null ve owner var), bonus verme
        const isNewTile = !cell?.letter || !cell?.owner;
        const multiplierAlreadyUsed = !!cell?.usedMultipliers;
        
        // Eğer multiplier daha önce kullanıldıysa (kalıcı işaret) tekrar uygulama
        if (isNewTile && !multiplierAlreadyUsed) {
          if (type === 'TW') {
            wordMultiplier *= 3;
            bonuses.push('3x Kelime');
          } else if (type === 'DW') {
            wordMultiplier *= 2;
            bonuses.push('2x Kelime');
          } else if (type === 'TL') {
            letterMultiplier = 3;
            bonuses.push(`3x ${letter}`);
          } else if (type === 'DL') {
            letterMultiplier = 2;
            bonuses.push(`2x ${letter}`);
          }
        }
      }
    });

    letterScore *= letterMultiplier;
    baseScore += letterScore;
  });

  const finalScore = baseScore * wordMultiplier;
  const bingo = word.length === 7;

  return {
    score: bingo ? finalScore + BONUS_SCORES.BINGO : finalScore,
    baseScore,
    multiplier: wordMultiplier,
    bonuses,
    bingo
  };
};

/**
 * Oyuncu istatistikleri için skor hesapla
 * @param {number} currentScore - Mevcut skor
 * @param {number} earnedScore - Kazanılan skor
 * @returns {number} - Toplam skor
 */
export const calculateTotalScore = (currentScore, earnedScore) => {
  return currentScore + earnedScore;
};

/**
 * Kazanma oranı hesapla
 * @param {number} wins - Kazanma sayısı
 * @param {number} totalGames - Toplam oyun sayısı
 * @returns {number} - Kazanma oranı (yüzde)
 */
export const calculateWinRate = (wins, totalGames) => {
  if (totalGames === 0) return 0;
  return Math.round((wins / totalGames) * 100);
};
