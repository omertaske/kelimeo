import { BOARD_SIZES, PREMIUM_POSITIONS } from '../../constants';

/**
 * Boş oyun tahtası oluştur
 * @param {number} size - Tahta boyutu
 * @returns {Array} - 2D tahta dizisi
 */
export const createEmptyBoard = (size = BOARD_SIZES.STANDARD) => {
  const board = new Array(size)
    .fill(null)
    .map(() =>
      new Array(size)
        .fill(null)
        .map(() => ({
          letter: null,
          multiplier: null,
          isCenter: false,
          owner: null
        }))
    );

  // Merkez yıldızı işaretle
  const center = Math.floor(size / 2);
  board[center][center].isCenter = true;

  // Premium kareleri yerleştir
  Object.entries(PREMIUM_POSITIONS).forEach(([type, positions]) => {
    positions.forEach(([row, col]) => {
      if (row < size && col < size) {
        board[row][col].multiplier = type;
      }
    });
  });

  return board;
};

/**
 * Tahtadaki tüm kelimeleri bul
 * @param {Array} board - Oyun tahtası
 * @param {Array} newPositions - Yeni yerleştirilen pozisyonlar
 * @returns {Array} - Bulunan kelimeler [{word, positions, direction}]
 */
export const findAllWords = (board, newPositions) => {
  const words = [];
  const size = board.length;
  const newPosSet = new Set(newPositions.map(p => `${p.row},${p.col}`));

  // Yatay kelimeleri bul
  for (let row = 0; row < size; row++) {
    let positions = [];

    for (let col = 0; col <= size; col++) {
      const hasLetter = col < size && board[row][col].letter;

      if (hasLetter) {
        positions.push({ row, col });
      }

      if (!hasLetter || col === size) {
        if (positions.length >= 2) {
          const hasNewTile = positions.some(p => newPosSet.has(`${p.row},${p.col}`));
          if (hasNewTile) {
            const word = positions.map(p => board[p.row][p.col].letter).join('');
            words.push({ word, positions: [...positions], direction: 'horizontal' });
          }
        }
        positions = [];
      }
    }
  }

  // Dikey kelimeleri bul
  for (let col = 0; col < size; col++) {
    let positions = [];

    for (let row = 0; row <= size; row++) {
      const hasLetter = row < size && board[row][col].letter;

      if (hasLetter) {
        positions.push({ row, col });
      }

      if (!hasLetter || row === size) {
        if (positions.length >= 2) {
          const hasNewTile = positions.some(p => newPosSet.has(`${p.row},${p.col}`));
          if (hasNewTile) {
            const word = positions.map(p => board[p.row][p.col].letter).join('');
            words.push({ word, positions: [...positions], direction: 'vertical' });
          }
        }
        positions = [];
      }
    }
  }

  // Eğer tek harf yerleştirildiyse
  if (words.length === 0 && newPositions.length === 1) {
    const pos = newPositions[0];
    const letter = board[pos.row][pos.col].letter;
    words.push({ 
      word: letter, 
      positions: [pos], 
      direction: 'single',
      isSingleLetter: true 
    });
  }

  return words;
};

/**
 * Pozisyonun tahta üzerinde geçerli olup olmadığını kontrol et
 * @param {number} row - Satır
 * @param {number} col - Sütun
 * @param {number} size - Tahta boyutu
 * @returns {boolean}
 */
export const isValidPosition = (row, col, size = BOARD_SIZES.STANDARD) => {
  return row >= 0 && row < size && col >= 0 && col < size;
};

/**
 * İki pozisyonun bitişik olup olmadığını kontrol et
 * @param {Object} pos1 - İlk pozisyon {row, col}
 * @param {Object} pos2 - İkinci pozisyon {row, col}
 * @returns {boolean}
 */
export const arePositionsAdjacent = (pos1, pos2) => {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

/**
 * Tahtada herhangi bir harf var mı kontrol et
 * @param {Array} board - Oyun tahtası
 * @returns {boolean}
 */
export const hasBoardAnyLetters = (board) => {
  return board.some(row => row.some(cell => cell.letter));
};

/**
 * Pozisyonun merkez karesi olup olmadığını kontrol et
 * @param {number} row - Satır
 * @param {number} col - Sütun
 * @param {number} size - Tahta boyutu
 * @returns {boolean}
 */
export const isCenterPosition = (row, col, size = BOARD_SIZES.STANDARD) => {
  const center = Math.floor(size / 2);
  return row === center && col === center;
};
