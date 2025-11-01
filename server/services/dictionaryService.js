const { toLowerCaseTurkish } = require('../utils/stringUtils');

// Basit TDK doğrulama: sozluk.gov.tr'yi sorgular
// Not: Node 18+ gerektirir (global fetch). Aksi durumda her zaman valid=false döner.
async function validateWord(word) {
  if (!word || typeof word !== 'string' || word.length < 2) {
    return { valid: false, error: 'Kelime en az 2 harf olmalı' };
  }
  try {
    if (typeof fetch !== 'function') {
      return { valid: false, error: 'Fetch desteklenmiyor (Node 18+ gerekli)' };
    }
    const url = `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(toLowerCaseTurkish(word))}`;
    const res = await fetch(url);
    if (!res.ok) return { valid: false, error: 'Sözlük servisi erişilemedi' };
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || data.error) {
      return { valid: false, error: 'Sözlükte yok' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Ağ hatası' };
  }
}

async function validateWords(words = []) {
  if (!Array.isArray(words) || words.length === 0) return { allValid: true, details: [] };
  const results = await Promise.all(words.map(w => validateWord(w)));
  const details = results.map((r, i) => ({ word: words[i], ...r }));
  const allValid = details.every(d => d.valid);
  return { allValid, details };
}

module.exports = { validateWord, validateWords };
