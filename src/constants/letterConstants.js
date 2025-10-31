// Türkçe Scrabble harf puanları
export const LETTER_SCORES = {
  'A': 1, 'E': 1, 'İ': 1, 'K': 1, 'L': 1, 'N': 1, 'R': 1, 'S': 2, 'T': 1, 'U': 2,
  'B': 3, 'D': 3, 'I': 2, 'M': 2, 'O': 2, 'Y': 3,
  'C': 4, 'Ç': 4, 'Ş': 4, 'Z': 4,
  'G': 5, 'H': 5, 'P': 5, 'V': 7,
  'F': 7, 'Ö': 7, 'Ü': 3,
  'Ğ': 8, 'J': 10
};

// Türkçe harf seti (oyun başlangıcında torba içeriği)
export const TURKISH_LETTERS = [
  'A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'Ç', 'D', 'D',
  'E', 'E', 'E', 'E', 'E', 'E', 'F', 'G', 'Ğ', 'H', 'H',
  'I', 'I', 'I', 'I', 'İ', 'İ', 'İ', 'İ', 'J', 'K', 'K',
  'L', 'L', 'L', 'M', 'M', 'N', 'N', 'N', 'N', 'O', 'O',
  'Ö', 'P', 'R', 'R', 'R', 'R', 'S', 'S', 'S', 'Ş', 'T',
  'T', 'T', 'T', 'U', 'U', 'Ü', 'V', 'Y', 'Y', 'Z'
];

// Harf dağılımı ve sayıları
export const LETTER_DISTRIBUTION = [
  { letter: 'A', score: 1, count: 12 },
  { letter: 'B', score: 3, count: 2 },
  { letter: 'C', score: 4, count: 2 },
  { letter: 'Ç', score: 4, count: 2 },
  { letter: 'D', score: 3, count: 3 },
  { letter: 'E', score: 1, count: 8 },
  { letter: 'F', score: 7, count: 1 },
  { letter: 'G', score: 5, count: 2 },
  { letter: 'Ğ', score: 8, count: 1 },
  { letter: 'H', score: 5, count: 1 },
  { letter: 'I', score: 2, count: 4 },
  { letter: 'İ', score: 1, count: 4 },
  { letter: 'J', score: 10, count: 1 },
  { letter: 'K', score: 1, count: 3 },
  { letter: 'L', score: 1, count: 5 },
  { letter: 'M', score: 2, count: 2 },
  { letter: 'N', score: 1, count: 7 },
  { letter: 'O', score: 2, count: 3 },
  { letter: 'Ö', score: 7, count: 1 },
  { letter: 'P', score: 5, count: 1 },
  { letter: 'R', score: 1, count: 6 },
  { letter: 'S', score: 2, count: 3 },
  { letter: 'Ş', score: 4, count: 2 },
  { letter: 'T', score: 1, count: 4 },
  { letter: 'U', score: 2, count: 3 },
  { letter: 'Ü', score: 3, count: 2 },
  { letter: 'V', score: 7, count: 1 },
  { letter: 'Y', score: 3, count: 2 },
  { letter: 'Z', score: 4, count: 1 },
  { letter: '*', score: 0, count: 2, isBlank: true } // Boş (Joker) taşlar
];
