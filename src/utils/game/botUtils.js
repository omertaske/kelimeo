// Yalnızca şu dosyadan kelimeleri al:
// Not: Dosya adında "ı" (dotless i) harfi kullanıcı isteğine göre kullanılmıştır.
import { TURKISH_WORD_POOL } from './turkıshWordPool';
import { toUpperCaseTurkish } from '../../helpers/stringHelpers';

// Yardımcı: Rastgele seçim (güvenli)
const pickRandom = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Bot'un elindeki harflerle oluşturabileceği kelimeleri filtrele
 * @param {Array<string>} botLetters - Bot'un elindeki harfler
 * @param {string} rank - Bot'un rank seviyesi
 * @param {Array<Array<{letter: string}>>} gameBoard - Oyun tahtası (opsiyonel)
 * @returns {Array<string>} - Oluşturulabilir kelimeler
 */
export const getPlayableWords = (botLetters = [], rank = 'Usta', gameBoard = null) => {
  if (!botLetters || botLetters.length === 0) return [];
  
  // Bot rank'ına göre kelime uzunluk aralığı
  let minLen = 2;
  let maxLen = 6;
  
  switch (rank) {
    case 'Çırak':
      minLen = 2; maxLen = 3;
      break;
    case 'Stajyer Kelimeci':
      minLen = 2; maxLen = 4;
      break;
    case 'Kelime Kaşifi':
      minLen = 3; maxLen = 5;
      break;
    case 'Sözcük Avcısı':
      minLen = 3; maxLen = 6;
      break;
    case 'Söz Bilgesi':
      minLen = 4; maxLen = 7;
      break;
    case 'Usta':
      minLen = 4; maxLen = 8;
      break;
    case 'Dil Ustası':
      minLen = 5; maxLen = 9;
      break;
    case 'Strateji Uzmanı':
      minLen = 5; maxLen = 10;
      break;
    case 'Şampiyon Kelimeci':
      minLen = 6; maxLen = 12;
      break;
    case 'Kelime Efsanesi':
      minLen = 7; maxLen = 15;
      break;
    default:
      minLen = 4; maxLen = 8;
  }
  
  // Tahtadan mevcut harfleri topla
  const boardLetters = [];
  if (gameBoard && Array.isArray(gameBoard)) {
    for (const row of gameBoard) {
      for (const cell of row) {
        if (cell && cell.letter) {
          boardLetters.push(toUpperCaseTurkish(cell.letter));
        }
      }
    }
  }
  
  // Bot'un kullanabileceği tüm harfler (el + tahta)
  const allAvailableLetters = [...botLetters.map(l => toUpperCaseTurkish(l)), ...boardLetters];
  const blankCount = botLetters.filter(l => l === '*').length;
  
  // Kelime havuzunu filtrele
  const playableWords = TURKISH_WORD_POOL.filter(word => {
    // Uzunluk kontrolü
    if (word.length < minLen || word.length > maxLen) return false;
    
    // Bu kelimeyi oluşturabilir miyiz?
    const wordLetters = [...toUpperCaseTurkish(word)];
    const tempLetters = [...allAvailableLetters];
    let blanksUsed = 0;
    
    for (const letter of wordLetters) {
      const index = tempLetters.indexOf(letter);
      if (index > -1) {
        tempLetters.splice(index, 1);
      } else {
        // Harf yok, blank kullan
        if (blanksUsed < blankCount) {
          blanksUsed++;
        } else {
          return false; // Ne harf var ne blank
        }
      }
    }
    
    return true;
  });
  
  // Sonuçları karıştır (çeşitlilik için)
  return playableWords.sort(() => Math.random() - 0.5);
};

/**
 * Bot için rastgele Türkçe kelime seçimi
 * @returns {string}
 */
export const getBotWord = () => {
  const word = pickRandom(TURKISH_WORD_POOL);
  // Havuz hatalı/boşsa güvenli bir varsayılan kelime dön
  return typeof word === 'string' && word.length > 0 ? word : 'OYUN';
};

/**
 * Zorluk seviyesine göre kelime seçimi (rank sistemine göre)
 * DEPRECATED: getPlayableWords kullanın
 */
export const getBotWordByDifficulty = (rank = 'Usta') => {
  let minLen = 2;
  let maxLen = 6;
  
  // Rank'a göre kelime uzunluğu aralığı
  switch (rank) {
    case 'Çırak':
      minLen = 2;
      maxLen = 3;
      break;
    case 'Stajyer Kelimeci':
      minLen = 2;
      maxLen = 4;
      break;
    case 'Kelime Kaşifi':
      minLen = 3;
      maxLen = 5;
      break;
    case 'Sözcük Avcısı':
      minLen = 3;
      maxLen = 6;
      break;
    case 'Söz Bilgesi':
      minLen = 4;
      maxLen = 7;
      break;
    case 'Usta':
      minLen = 4;
      maxLen = 8;
      break;
    case 'Dil Ustası':
      minLen = 5;
      maxLen = 9;
      break;
    case 'Strateji Uzmanı':
      minLen = 5;
      maxLen = 10;
      break;
    case 'Şampiyon Kelimeci':
      minLen = 6;
      maxLen = 12;
      break;
    case 'Kelime Efsanesi':
      minLen = 7;
      maxLen = 15;
      break;
    default:
      minLen = 4;
      maxLen = 8;
  }
  
  const filteredWords = TURKISH_WORD_POOL.filter(w => w.length >= minLen && w.length <= maxLen);
  const words = filteredWords.length > 0 ? filteredWords : TURKISH_WORD_POOL;
  return pickRandom(words) || 'OYUN';
};

// Yerleştirme uygunluk kontrolü
const canPlace = (board, word, startRow, startCol, direction) => {
  const size = board.length;
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'vertical' ? startRow + i : startRow;
    const c = direction === 'horizontal' ? startCol + i : startCol;

    // Tahta sınırı
    if (r < 0 || c < 0 || r >= size || c >= size) return false;

    const cell = board[r][c];
    const existing = cell?.letter;
    // Hücre doluysa aynı harf olmalı (çapraz yerleşim için)
    if (existing && existing !== word[i]) return false;
  }
  return true;
};

/**
 * Bot için uygun pozisyon seçimi
 * - Önce merkez bölge denenir, bulunamazsa tüm tahta taranır
 * @param {Array<Array<{letter?: string}>>} board
 * @param {string} word
 * @returns {{positions:Array<{row:number,col:number}>, direction:'horizontal'|'vertical'} | null}
 */
export const getBotPlacement = (board, word) => {
  const size = board.length;
  const centerMin = Math.max(0, Math.floor(size * 0.2));
  const centerMax = Math.min(size - 1, Math.ceil(size * 0.8));

  const allStarts = [];
  const centerStarts = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const coord = { row: r, col: c };
      allStarts.push(coord);
      if (r >= centerMin && r <= centerMax && c >= centerMin && c <= centerMax) {
        centerStarts.push(coord);
      }
    }
  }

  const tryAreas = [centerStarts, allStarts];
  for (const starts of tryAreas) {
    const candidates = [];

    for (const start of starts) {
      for (const direction of ['horizontal', 'vertical']) {
        if (!canPlace(board, word, start.row, start.col, direction)) continue;

        const positions = [];
        for (let i = 0; i < word.length; i++) {
          positions.push({
            row: direction === 'vertical' ? start.row + i : start.row,
            col: direction === 'horizontal' ? start.col + i : start.col,
          });
        }
        candidates.push({ positions, direction });
      }
    }

    if (candidates.length) return pickRandom(candidates);
  }

  return null;
};

/**
 * Bot hamlesi simülasyonu
 * @param {Array<Array<{letter?: string}>>} board
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {{word:string, positions:Array<{row:number,col:number}>, score:number, direction:'horizontal'|'vertical'} | null}
 */
export const simulateBotMove = (board, difficulty = 'medium') => {
  const word = getBotWordByDifficulty(difficulty);
  const placement = getBotPlacement(board, word);
  if (!placement) return null;

  const baseScore = word.length * 10;
  const randomBonus = Math.floor(Math.random() * 20);

  return {
    word,
    positions: placement.positions,
    score: baseScore + randomBonus,
    direction: placement.direction,
  };
};
