// Skor çarpanları
export const SCORE_MULTIPLIERS = {
  DOUBLE_LETTER: 2,
  TRIPLE_LETTER: 3,
  DOUBLE_WORD: 2,
  TRIPLE_WORD: 3
};

// Bonus puanlar
export const BONUS_SCORES = {
  BINGO: 50, // 7 harf kullanıldığında
  FIRST_WORD: 10 // İlk kelime bonusu (opsiyonel)
};

// Minimum ve maksimum değerler
export const SCORE_LIMITS = {
  MIN_WORD_LENGTH: 2,
  MAX_WORD_LENGTH: 15,
  INITIAL_LETTER_COUNT: 7,
  MAX_TIME_PER_TURN: 120 // saniye
};
