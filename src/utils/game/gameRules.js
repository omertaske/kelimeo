/**
 * Scrabble Oyun Kuralları
 * Hem bot hem de gerçek oyuncular için geçerli kurallar
 */

import { toUpperCaseTurkish } from '../../helpers/stringHelpers';

/**
 * Merkez pozisyonunu hesapla
 * @param {number} boardSize - Tahta boyutu (örn: 15)
 * @returns {{row: number, col: number}} - Merkez pozisyonu
 */
export const getCenterPosition = (boardSize) => {
  const center = Math.floor(boardSize / 2);
  return { row: center, col: center };
};

/**
 * İlk hamle kontrolü - merkez yıldıza dokunmalı
 * @param {Array} gameBoard - Oyun tahtası
 * @param {Array} positions - Yerleştirilecek pozisyonlar [{row, col}]
 * @returns {{valid: boolean, error: string}} - Geçerlilik durumu
 */
export const validateFirstMove = (gameBoard, positions) => {
  // Tahtada hiç harf var mı kontrol et
  const hasAnyLetterOnBoard = gameBoard.some(row => 
    row.some(cell => cell.letter)
  );

  // Eğer tahtada harf yoksa bu ilk hamle
  if (!hasAnyLetterOnBoard) {
    const centerPos = getCenterPosition(gameBoard.length);
    const touchesCenter = positions.some(
      p => p.row === centerPos.row && p.col === centerPos.col
    );

    if (!touchesCenter) {
      return {
        valid: false,
        error: `İlk hamle merkez yıldıza (${centerPos.row}, ${centerPos.col}) dokunmalıdır!`
      };
    }

    // İlk hamle en az 2 harf olmalı
    if (positions.length < 2) {
      return {
        valid: false,
        error: 'İlk hamle en az 2 harfli bir kelime olmalıdır!'
      };
    }
  }

  return { valid: true };
};

/**
 * Bitişiklik ve kesişim kontrolü - yeni harfler mevcut kelimelere bitişik VEYA kesişen olmalı
 * @param {Array} gameBoard - Oyun tahtası
 * @param {Array} positions - Yerleştirilecek pozisyonlar [{row, col}]
 * @returns {{valid: boolean, error: string}} - Geçerlilik durumu
 */
export const validateAdjacency = (gameBoard, positions) => {
  // Tahtada hiç harf var mı kontrol et
  const hasAnyLetterOnBoard = gameBoard.some(row => 
    row.some(cell => cell.letter)
  );

  // İlk hamleyse bitişiklik kontrolü yapma
  if (!hasAnyLetterOnBoard) {
    return { valid: true };
  }

  // İKİ DURUM GEÇERLİ:
  // 1. Yeni harfler, tahtadaki mevcut harflerle kesişiyor (aynı satır/sütunda)
  // 2. Yeni harfler, tahtadaki mevcut harflere bitişik ama kesişmiyor
  
  let hasIntersection = false; // Mevcut harflerle kesişiyor mu?
  let hasAdjacent = false; // Mevcut harflere bitişik mi?

  // Yerleşim yönünü belirle
  const isHorizontal = positions.length === 1 || positions.every(p => p.row === positions[0].row);
  
  if (isHorizontal) {
    // Yatay yerleşim - aynı satırda mevcut harf var mı?
    const row = positions[0].row;
    const minCol = Math.min(...positions.map(p => p.col));
    const maxCol = Math.max(...positions.map(p => p.col));
    
    // Bu satırda, yeni harfler arasında veya yanında mevcut harf var mı?
    for (let col = minCol; col <= maxCol; col++) {
      if (gameBoard[row][col].letter && !positions.some(p => p.col === col)) {
        hasIntersection = true;
        break;
      }
    }
  } else {
    // Dikey yerleşim - aynı sütunda mevcut harf var mı?
    const col = positions[0].col;
    const minRow = Math.min(...positions.map(p => p.row));
    const maxRow = Math.max(...positions.map(p => p.row));
    
    // Bu sütunda, yeni harfler arasında veya yanında mevcut harf var mı?
    for (let row = minRow; row <= maxRow; row++) {
      if (gameBoard[row][col].letter && !positions.some(p => p.row === row)) {
        hasIntersection = true;
        break;
      }
    }
  }

  // Eğer kesişim yoksa, en az bitişik olmalı
  if (!hasIntersection) {
    for (const pos of positions) {
      const { row, col } = pos;
      
      // 4 yönü kontrol et (üst, alt, sol, sağ)
      const neighbors = [
        { row: row - 1, col }, // üst
        { row: row + 1, col }, // alt
        { row, col: col - 1 }, // sol
        { row, col: col + 1 }  // sağ
      ];

      for (const neighbor of neighbors) {
        // Tahta sınırları içinde mi?
        if (
          neighbor.row >= 0 && 
          neighbor.row < gameBoard.length &&
          neighbor.col >= 0 && 
          neighbor.col < gameBoard.length
        ) {
          // Bu komşuda mevcut bir harf var mı?
          // Ve bu komşu yeni yerleştirilen harflerden biri değil mi?
          if (
            gameBoard[neighbor.row][neighbor.col].letter &&
            !positions.some(p => p.row === neighbor.row && p.col === neighbor.col)
          ) {
            hasAdjacent = true;
            break;
          }
        }
      }

      if (hasAdjacent) break;
    }
  }

  // Kesişim VEYA bitişiklik gerekli
  if (!hasIntersection && !hasAdjacent) {
    return {
      valid: false,
      error: 'Yeni harfler mevcut harflerle kesişmeli veya bitişik olmalıdır!'
    };
  }

  return { valid: true };
};

/**
 * Harf yerleşimi kontrolü - tüm harfler aynı satır veya sütunda mı?
 * @param {Array} positions - Yerleştirilecek pozisyonlar [{row, col}]
 * @returns {{valid: boolean, error: string, isHorizontal: boolean}} - Geçerlilik durumu
 */
export const validatePlacement = (positions) => {
  if (positions.length === 0) {
    return { valid: false, error: 'Lütfen harfleri tahtaya yerleştirin!' };
  }

  if (positions.length === 1) {
    // Tek harf yerleştirme - mevcut kelimeye ekleme yapılıyor olabilir
    return { valid: true, isHorizontal: null };
  }

  // Tüm harfler aynı satırda mı?
  const allSameRow = positions.every(p => p.row === positions[0].row);
  
  // Tüm harfler aynı sütunda mı?
  const allSameCol = positions.every(p => p.col === positions[0].col);

  if (!allSameRow && !allSameCol) {
    return {
      valid: false,
      error: 'Harfler yatay veya dikey bir çizgide olmalıdır!'
    };
  }

  return { 
    valid: true, 
    isHorizontal: allSameRow 
  };
};

/**
 * Boşluk kontrolü - harfler arasında boşluk var mı?
 * @param {Array} gameBoard - Oyun tahtası
 * @param {Array} positions - Yerleştirilecek pozisyonlar [{row, col}]
 * @param {boolean} isHorizontal - Yatay yerleşim mi?
 * @returns {{valid: boolean, error: string}} - Geçerlilik durumu
 */
export const validateGaps = (gameBoard, positions, isHorizontal) => {
  if (positions.length === 1) {
    return { valid: true };
  }

  // Pozisyonları sırala
  const sorted = [...positions].sort((a, b) => {
    return isHorizontal ? a.col - b.col : a.row - b.row;
  });

  // Ardışık pozisyonlar arasında boşluk kontrolü
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (isHorizontal) {
      // Yatay - sütunlar arası kontrol
      const gap = next.col - current.col;
      
      // Eğer ara pozisyonlarda mevcut harf yoksa hata
      for (let col = current.col + 1; col < next.col; col++) {
        if (!gameBoard[current.row][col].letter) {
          return {
            valid: false,
            error: 'Harfler arasında boşluk bırakamazsınız!'
          };
        }
      }
    } else {
      // Dikey - satırlar arası kontrol
      const gap = next.row - current.row;
      
      // Eğer ara pozisyonlarda mevcut harf yoksa hata
      for (let row = current.row + 1; row < next.row; row++) {
        if (!gameBoard[row][current.col].letter) {
          return {
            valid: false,
            error: 'Harfler arasında boşluk bırakamazsınız!'
          };
        }
      }
    }
  }

  return { valid: true };
};

/**
 * Tüm yerleşim kurallarını kontrol et
 * @param {Array} gameBoard - Oyun tahtası
 * @param {Array} positions - Yerleştirilecek pozisyonlar [{row, col}]
 * @returns {{valid: boolean, error: string}} - Geçerlilik durumu
 */
export const validateMove = (gameBoard, positions) => {
  // 1. Yerleşim kontrolü (yatay/dikey)
  const placementCheck = validatePlacement(positions);
  if (!placementCheck.valid) {
    return placementCheck;
  }

  // 2. İlk hamle kontrolü
  const firstMoveCheck = validateFirstMove(gameBoard, positions);
  if (!firstMoveCheck.valid) {
    return firstMoveCheck;
  }

  // 3. Bitişiklik kontrolü (ilk hamle değilse)
  const adjacencyCheck = validateAdjacency(gameBoard, positions);
  if (!adjacencyCheck.valid) {
    return adjacencyCheck;
  }

  // 4. Boşluk kontrolü
  if (placementCheck.isHorizontal !== null) {
    const gapCheck = validateGaps(gameBoard, positions, placementCheck.isHorizontal);
    if (!gapCheck.valid) {
      return gapCheck;
    }
  }

  return { valid: true };
};

/**
 * Bot için geçerli hamle pozisyonları bul
 * Bot, mevcut harfleri KULLANARAK kelime oluşturmalı
 * @param {Array} gameBoard - Oyun tahtası
 * @param {string} word - Yerleştirilecek kelime
 * @returns {Array} - Geçerli pozisyon listesi
 */
export const findValidBotPositions = (gameBoard, word, botLetters = []) => {
  const validPositions = [];
  const hasAnyLetter = gameBoard.some(row => row.some(cell => cell.letter));
  
  // Türkçe karakterler için normalize et
  const normalizedWord = toUpperCaseTurkish(word);
  
  // Bot'un elindeki harfleri kontrol et (blank * dahil)
  const availableLetters = [...botLetters]; // Kopyala

  if (!hasAnyLetter) {
    // İlk hamle - merkeze yatay yerleştir
    const center = getCenterPosition(gameBoard.length);
    const startCol = center.col - Math.floor(normalizedWord.length / 2);
    
    if (startCol >= 0 && startCol + normalizedWord.length <= gameBoard.length) {
      // Bot'un bu kelimeyi oluşturabilecek harfleri var mı kontrol et
      const neededLetters = [...normalizedWord];
      const tempAvailable = [...availableLetters];
      let canPlace = true;
      
      for (const letter of neededLetters) {
        const index = tempAvailable.indexOf(letter);
        if (index > -1) {
          tempAvailable.splice(index, 1);
        } else {
          // Harf yok, blank var mı?
          const blankIndex = tempAvailable.indexOf('*');
          if (blankIndex > -1) {
            tempAvailable.splice(blankIndex, 1);
          } else {
            canPlace = false;
            break;
          }
        }
      }
      
      if (canPlace) {
        const positions = [];
        for (let i = 0; i < normalizedWord.length; i++) {
          positions.push({
            row: center.row,
            col: startCol + i,
            letter: normalizedWord[i],
            isNew: true // Yeni yerleştirilen harf
          });
        }
        validPositions.push(positions);
      }
    }
  } else {
    // MEVCUT HARFLERİ KULLANARAK kelime oluştur
    // Tahtadaki her harf için, bu harfi kullanarak kelime yerleştirmeyi dene
    
    for (let row = 0; row < gameBoard.length; row++) {
      for (let col = 0; col < gameBoard[row].length; col++) {
        const existingLetter = gameBoard[row][col].letter;
        
        if (existingLetter) {
          // Tahtadaki harfi de normalize et
          const normalizedExisting = toUpperCaseTurkish(existingLetter);
          
          // Bu harfin kelimede olduğu tüm pozisyonları bul
          for (let wordIndex = 0; wordIndex < normalizedWord.length; wordIndex++) {
            if (normalizedWord[wordIndex] === normalizedExisting) {
              // Bu harfi kullanarak yatay yerleştirmeyi dene
              const horizontalPos = tryPlaceHorizontal(gameBoard, normalizedWord, row, col, wordIndex, availableLetters);
              if (horizontalPos.length > 0) {
                validPositions.push(horizontalPos);
              }
              
              // Bu harfi kullanarak dikey yerleştirmeyi dene
              const verticalPos = tryPlaceVertical(gameBoard, normalizedWord, row, col, wordIndex, availableLetters);
              if (verticalPos.length > 0) {
                validPositions.push(verticalPos);
              }
            }
          }
        }
      }
    }
  }

  return validPositions;
};

/**
 * Yatay yerleştirmeyi dene - mevcut harfi kullanarak
 * @param {Array} gameBoard - Oyun tahtası
 * @param {string} word - Kelime (normalize edilmiş)
 * @param {number} row - Mevcut harfin satırı
 * @param {number} col - Mevcut harfin sütunu
 * @param {number} wordIndex - Kelimedeki harf indeksi
 * @param {Array} botLetters - Bot'un elindeki harfler
 * @returns {Array} - Pozisyon listesi (boşsa geçersiz)
 */
function tryPlaceHorizontal(gameBoard, word, row, col, wordIndex, botLetters = []) {
  const positions = [];
  const startCol = col - wordIndex; // Kelimenin başlangıç sütunu
  
  // Sınır kontrolü
  if (startCol < 0 || startCol + word.length > gameBoard.length) {
    return [];
  }
  
  // Bot'un elindeki harfleri kullanabilir mi kontrol et
  const tempLetters = [...botLetters];
  
  // Tüm pozisyonları kontrol et
  for (let i = 0; i < word.length; i++) {
    const currentCol = startCol + i;
    const cell = gameBoard[row][currentCol];
    
    if (i === wordIndex) {
      // Bu pozisyonda zaten mevcut harf var (kullanıyoruz)
      continue;
    } else if (cell.letter) {
      // Başka bir mevcut harf var - kelime harfi eşleşmeli (Türkçe karakterler için normalize et)
      const normalizedCellLetter = toUpperCaseTurkish(cell.letter);
      if (normalizedCellLetter !== word[i]) {
        return []; // Eşleşmiyor, geçersiz
      }
    } else {
      // Boş hücre - yeni harf yerleştirilecek
      // Bot'un bu harfi var mı kontrol et
      const letterIndex = tempLetters.indexOf(word[i]);
      if (letterIndex > -1) {
        tempLetters.splice(letterIndex, 1);
      } else {
        // Harf yok, blank var mı?
        const blankIndex = tempLetters.indexOf('*');
        if (blankIndex > -1) {
          tempLetters.splice(blankIndex, 1);
        } else {
          return []; // Ne harf var ne blank, geçersiz
        }
      }
      
      positions.push({
        row: row,
        col: currentCol,
        letter: word[i],
        isNew: true // Yeni yerleştirilen harf
      });
    }
  }
  
  // En az bir yeni harf yerleştirilmeli
  return positions.length > 0 ? positions : [];
}

/**
 * Dikey yerleştirmeyi dene - mevcut harfi kullanarak
 * @param {Array} gameBoard - Oyun tahtası
 * @param {string} word - Kelime (normalize edilmiş)
 * @param {number} row - Mevcut harfin satırı
 * @param {number} col - Mevcut harfin sütunu
 * @param {number} wordIndex - Kelimedeki harf indeksi
 * @param {Array} botLetters - Bot'un elindeki harfler
 * @returns {Array} - Pozisyon listesi (boşsa geçersiz)
 */
function tryPlaceVertical(gameBoard, word, row, col, wordIndex, botLetters = []) {
  const positions = [];
  const startRow = row - wordIndex; // Kelimenin başlangıç satırı
  
  // Sınır kontrolü
  if (startRow < 0 || startRow + word.length > gameBoard.length) {
    return [];
  }
  
  // Bot'un elindeki harfleri kullanabilir mi kontrol et
  const tempLetters = [...botLetters];
  
  // Tüm pozisyonları kontrol et
  for (let i = 0; i < word.length; i++) {
    const currentRow = startRow + i;
    const cell = gameBoard[currentRow][col];
    
    if (i === wordIndex) {
      // Bu pozisyonda zaten mevcut harf var (kullanıyoruz)
      continue;
    } else if (cell.letter) {
      // Başka bir mevcut harf var - kelime harfi eşleşmeli (Türkçe karakterler için normalize et)
      const normalizedCellLetter = toUpperCaseTurkish(cell.letter);
      if (normalizedCellLetter !== word[i]) {
        return []; // Eşleşmiyor, geçersiz
      }
    } else {
      // Boş hücre - yeni harf yerleştirilecek
      // Bot'un bu harfi var mı kontrol et
      const letterIndex = tempLetters.indexOf(word[i]);
      if (letterIndex > -1) {
        tempLetters.splice(letterIndex, 1);
      } else {
        // Harf yok, blank var mı?
        const blankIndex = tempLetters.indexOf('*');
        if (blankIndex > -1) {
          tempLetters.splice(blankIndex, 1);
        } else {
          return []; // Ne harf var ne blank, geçersiz
        }
      }
      
      positions.push({
        row: currentRow,
        col: col,
        letter: word[i],
        isNew: true // Yeni yerleştirilen harf
      });
    }
  }
  
  // En az bir yeni harf yerleştirilmeli
  return positions.length > 0 ? positions : [];
}
