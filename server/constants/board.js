const BOARD_SIZE = 15;

// Premium kare pozisyonları (örnek temel yerleşim; gerekirse genişletilir)
const PREMIUM_POSITIONS = {
  TW: [ [0,0], [0,7], [0,14], [7,0], [7,14], [14,0], [14,7], [14,14] ],
  DW: [ [1,1], [2,2], [3,3], [4,4], [10,10], [11,11], [12,12], [13,13], [1,13], [2,12], [3,11], [4,10], [10,4], [11,3], [12,2], [13,1] ],
  TL: [ [1,5], [5,1], [5,5], [5,9], [9,5], [9,9], [13,5], [5,13] ],
  DL: [ [0,3], [2,6], [3,0], [6,2], [3,14], [6,12], [14,11], [12,8] ]
};

// Harf puanları ve dağılım (örnek; client ile uyumlu tutulmalı)
const LETTER_SCORES = {
  'A': 1, 'B': 3, 'C': 4, 'Ç': 4, 'D': 3, 'E': 1, 'F': 7, 'G': 5, 'Ğ': 8,
  'H': 5, 'I': 2, 'İ': 1, 'J': 10, 'K': 1, 'L': 1, 'M': 2, 'N': 1, 'O': 2,
  'Ö': 7, 'P': 5, 'R': 1, 'S': 2, 'Ş': 4, 'T': 1, 'U': 2, 'Ü': 3, 'V': 7,
  'Y': 3, 'Z': 4, '*': 0
};

const LETTER_DISTRIBUTION = [
  { letter: 'A', count: 6, score: 1 },
  { letter: 'E', count: 6, score: 1 },
  { letter: 'L', count: 3, score: 1 },
  { letter: 'R', count: 4, score: 1 },
  { letter: 'N', count: 4, score: 1 },
  { letter: 'T', count: 4, score: 1 },
  { letter: 'İ', count: 4, score: 1 },
  { letter: 'K', count: 2, score: 1 },
  { letter: 'M', count: 2, score: 2 },
  { letter: 'S', count: 3, score: 2 },
  { letter: 'I', count: 4, score: 2 },
  { letter: 'U', count: 2, score: 2 },
  { letter: 'O', count: 2, score: 2 },
  { letter: 'B', count: 2, score: 3 },
  { letter: 'Ü', count: 2, score: 3 },
  { letter: 'C', count: 2, score: 4 },
  { letter: 'Ç', count: 2, score: 4 },
  { letter: 'Z', count: 2, score: 4 },
  { letter: 'D', count: 2, score: 3 },
  { letter: 'G', count: 2, score: 5 },
  { letter: 'H', count: 2, score: 5 },
  { letter: 'P', count: 1, score: 5 },
  { letter: 'Ö', count: 1, score: 7 },
  { letter: 'F', count: 1, score: 7 },
  { letter: 'V', count: 1, score: 7 },
  { letter: 'Ğ', count: 1, score: 8 },
  { letter: 'J', count: 1, score: 10 },
  { letter: 'Y', count: 2, score: 3 },
  { letter: '*', count: 2, score: 0, isBlank: true }
];

module.exports = { BOARD_SIZE, PREMIUM_POSITIONS, LETTER_SCORES, LETTER_DISTRIBUTION };
