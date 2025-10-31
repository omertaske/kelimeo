/**
 * Zaman formatlama yardımcı fonksiyonları
 */

/**
 * Saniyeyi MM:SS formatına çevir
 * @param {number} seconds - Saniye
 * @returns {string} - Formatlanmış zaman
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Saniyeyi HH:MM:SS formatına çevir
 * @param {number} seconds - Saniye
 * @returns {string} - Formatlanmış zaman
 */
export const formatLongTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Tarihi okunabilir formata çevir
 * @param {Date|string} date - Tarih
 * @returns {string} - Formatlanmış tarih
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Tarihi ve saati okunabilir formata çevir
 * @param {Date|string} dateTime - Tarih ve saat
 * @returns {string} - Formatlanmış tarih ve saat
 */
export const formatDateTime = (dateTime) => {
  const d = new Date(dateTime);
  return d.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * İki tarih arasındaki farkı hesapla
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {string} - Fark (örn: "2 gün önce")
 */
export const getTimeDifference = (startDate, endDate = new Date()) => {
  const diff = endDate - new Date(startDate);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} gün önce`;
  if (hours > 0) return `${hours} saat önce`;
  if (minutes > 0) return `${minutes} dakika önce`;
  return 'Az önce';
};
