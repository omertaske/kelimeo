/**
 * TDK Sözlük API servisi
 */

import { toLowerCaseTurkish } from '../helpers/stringHelpers';

const TDK_BASE_URL = 'https://sozluk.gov.tr/gts';

/**
 * TDK API'den kelime ara
 * @param {string} word - Aranacak kelime
 * @returns {Promise<Object>} - API yanıtı
 */
export const searchWord = async (word) => {
  try {
    const response = await fetch(
      `${TDK_BASE_URL}?ara=${encodeURIComponent(toLowerCaseTurkish(word))}`
    );
    
    if (!response.ok) {
      throw new Error('API yanıt vermedi');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('TDK API hatası:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Kelimenin anlamını al
 * @param {string} word - Kelime
 * @returns {Promise<Object>} - {success, meaning, error}
 */
export const getWordMeaning = async (word) => {
  const result = await searchWord(word);
  
  if (!result.success) {
    return { success: false, error: 'Kelime bulunamadı' };
  }

  const data = result.data;
  
  if (!data || data.error || !Array.isArray(data) || data.length === 0) {
    return { success: false, error: 'Kelime sözlükte yok' };
  }

  const meaning = data[0]?.anlamlarListe?.[0]?.anlam || '';
  
  return { success: true, meaning, data: data[0] };
};

/**
 * Çoklu kelime araması
 * @param {Array<string>} words - Aranacak kelimeler
 * @returns {Promise<Array>} - Kelime sonuçları
 */
export const searchMultipleWords = async (words) => {
  const promises = words.map(word => getWordMeaning(word));
  const results = await Promise.all(promises);
  
  return results.map((result, index) => ({
    word: words[index],
    ...result
  }));
};
