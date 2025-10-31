import { toLowerCaseTurkish } from '../../helpers/stringHelpers';

/**
 * TDK API ile kelime doğrulama
 * @param {string} word - Doğrulanacak kelime
 * @returns {Promise<Object>} - {valid, meaning, error}
 */
export const validateWord = async (word) => {
  if (!word || word.length < 2) {
    return { valid: false, error: 'Kelime en az 2 harf olmalı!' };
  }

  try {
    const response = await fetch(
      `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(toLowerCaseTurkish(word))}`
    );
    
    if (!response.ok) {
      return { valid: false, error: 'Kelime kontrolü yapılamadı!' };
    }

    const data = await response.json();
    
    if (!data || data.error || !Array.isArray(data) || data.length === 0) {
      return { valid: false, error: `"${word}" kelimesi sözlükte bulunamadı!` };
    }

    const meaning = data[0]?.anlamlarListe?.[0]?.anlam || '';
    return { valid: true, meaning };
  } catch (error) {
    console.error('Kelime doğrulama hatası:', error);
    return { valid: false, error: 'Bağlantı hatası!' };
  }
};

/**
 * Basit kelime format kontrolü
 * @param {string} word - Kontrol edilecek kelime
 * @returns {boolean} - Geçerli mi?
 */
export const isValidWordFormat = (word) => {
  if (!word || typeof word !== 'string') return false;
  if (word.length < 2) return false;
  
  // Sadece Türkçe harfler
  const turkishLetterPattern = /^[A-ZÇĞİÖŞÜ]+$/i;
  return turkishLetterPattern.test(word);
};

/**
 * Çoklu kelime doğrulama
 * @param {Array<string>} words - Doğrulanacak kelimeler
 * @returns {Promise<Object>} - {allValid, results}
 */
export const validateMultipleWords = async (words) => {
  const results = await Promise.all(
    words.map(word => validateWord(word))
  );
  
  const allValid = results.every(result => result.valid);
  
  return {
    allValid,
    results: results.map((result, index) => ({
      word: words[index],
      ...result
    }))
  };
};
