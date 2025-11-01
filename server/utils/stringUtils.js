function toUpperCaseTurkish(str) {
  if (!str) return '';
  return str.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

function toLowerCaseTurkish(str) {
  if (!str) return '';
  return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

module.exports = { toUpperCaseTurkish, toLowerCaseTurkish };
