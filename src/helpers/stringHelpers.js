/**
 * String formatlama yardımcı fonksiyonları
 */

/**
 * Kelimenin ilk harfini büyük yap
 * @param {string} str - String
 * @returns {string} - Formatlanmış string
 */
export const capitalize = (str) => {
  if (!str) return '';
  const firstChar = str.charAt(0);
  const upperFirst = firstChar === 'i' ? 'İ' : firstChar === 'ı' ? 'I' : firstChar.toUpperCase();
  return upperFirst + str.slice(1).toLowerCase();
};

/**
 * Tüm kelimelerin ilk harfini büyük yap
 * @param {string} str - String
 * @returns {string} - Formatlanmış string
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.split(' ').map(capitalize).join(' ');
};

/**
 * String'i tamamen büyük harfe çevir (Türkçe karakterler için)
 * @param {string} str - String
 * @returns {string} - Büyük harfli string
 */
export const toUpperCaseTurkish = (str) => {
  if (!str) return '';
  return str
    .replace(/i/g, 'İ')
    .replace(/ı/g, 'I')
    .toUpperCase();
};

/**
 * String'i tamamen küçük harfe çevir (Türkçe karakterler için)
 * @param {string} str - String
 * @returns {string} - Küçük harfli string
 */
export const toLowerCaseTurkish = (str) => {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase();
};

/**
 * Sayıyı formatla (1000 -> 1.000)
 * @param {number} num - Sayı
 * @returns {string} - Formatlanmış sayı
 */
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Kısaltılmış sayı formatı (1000 -> 1K, 1000000 -> 1M)
 * @param {number} num - Sayı
 * @returns {string} - Kısaltılmış sayı
 */
export const formatCompactNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Yüzde formatla
 * @param {number} value - Değer
 * @param {number} total - Toplam
 * @param {number} decimals - Ondalık basamak sayısı
 * @returns {string} - Yüzde
 */
export const formatPercentage = (value, total, decimals = 0) => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};
