function normalizeNFC(str) {
  if (!str) return '';
  try {
    return str.normalize('NFC');
  } catch {
    return str; // Eski ortamlarda normalize olmayabilir
  }
}

function toUpperCaseTurkish(str) {
  if (!str) return '';
  const s = normalizeNFC(String(str));
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

function toLowerCaseTurkish(str) {
  if (!str) return '';
  const s = normalizeNFC(String(str));
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

module.exports = { toUpperCaseTurkish, toLowerCaseTurkish, normalizeNFC };
