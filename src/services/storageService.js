/**
 * LocalStorage yönetimi için servis
 */

const STORAGE_KEYS = {
  USERS: 'scrabbleUsers',
  CURRENT_USER: 'currentScrabbleUser',
  GAME_STATE: 'scrabbleGameState',
  SETTINGS: 'scrabbleSettings'
};

/**
 * LocalStorage'dan veri oku
 * @param {string} key - Anahtar
 * @param {*} defaultValue - Varsayılan değer
 * @returns {*} - Okunan veri
 */
export const getItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`LocalStorage okuma hatası (${key}):`, error);
    return defaultValue;
  }
};

/**
 * LocalStorage'a veri yaz
 * @param {string} key - Anahtar
 * @param {*} value - Değer
 * @returns {boolean} - Başarılı mı?
 */
export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`LocalStorage yazma hatası (${key}):`, error);
    return false;
  }
};

/**
 * LocalStorage'dan veri sil
 * @param {string} key - Anahtar
 * @returns {boolean} - Başarılı mı?
 */
export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`LocalStorage silme hatası (${key}):`, error);
    return false;
  }
};

/**
 * Kullanıcıları al
 * @returns {Object} - {users, bots}
 */
export const getUsers = () => {
  return getItem(STORAGE_KEYS.USERS, { users: [], bots: [] });
};

/**
 * Kullanıcıları kaydet
 * @param {Array} users - Kullanıcılar
 * @param {Array} bots - Botlar
 * @returns {boolean} - Başarılı mı?
 */
export const saveUsers = (users, bots = []) => {
  return setItem(STORAGE_KEYS.USERS, { users, bots });
};

/**
 * Mevcut kullanıcıyı al
 * @returns {Object|null} - Kullanıcı
 */
export const getCurrentUser = () => {
  return getItem(STORAGE_KEYS.CURRENT_USER);
};

/**
 * Mevcut kullanıcıyı kaydet
 * @param {Object} user - Kullanıcı
 * @returns {boolean} - Başarılı mı?
 */
export const saveCurrentUser = (user) => {
  return setItem(STORAGE_KEYS.CURRENT_USER, user);
};

/**
 * Mevcut kullanıcıyı temizle
 * @returns {boolean} - Başarılı mı?
 */
export const clearCurrentUser = () => {
  return removeItem(STORAGE_KEYS.CURRENT_USER);
};

/**
 * Oyun durumunu kaydet
 * @param {Object} gameState - Oyun durumu
 * @returns {boolean} - Başarılı mı?
 */
export const saveGameState = (gameState) => {
  return setItem(STORAGE_KEYS.GAME_STATE, gameState);
};

/**
 * Oyun durumunu al
 * @returns {Object|null} - Oyun durumu
 */
export const getGameState = () => {
  return getItem(STORAGE_KEYS.GAME_STATE);
};

/**
 * Oyun durumunu temizle
 * @returns {boolean} - Başarılı mı?
 */
export const clearGameState = () => {
  return removeItem(STORAGE_KEYS.GAME_STATE);
};

export { STORAGE_KEYS };
