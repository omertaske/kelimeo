/**
 * Form validasyon fonksiyonları
 */

/**
 * Kullanıcı adı validasyonu
 * @param {string} username - Kullanıcı adı
 * @returns {Object} - {valid, error}
 */
export const validateUsername = (username) => {
  if (!username || !username.trim()) {
    return { valid: false, error: 'Kullanıcı adı gerekli!' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Kullanıcı adı en az 3 karakter olmalı!' };
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Kullanıcı adı en fazla 20 karakter olabilir!' };
  }
  
  return { valid: true };
};

/**
 * E-mail validasyonu
 * @param {string} email - E-mail adresi
 * @returns {Object} - {valid, error}
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return { valid: false, error: 'E-mail adresi gerekli!' };
  }
  
  if (!email.includes('@')) {
    return { valid: false, error: 'Geçerli bir e-mail adresi girin!' };
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Geçersiz e-mail formatı!' };
  }
  
  return { valid: true };
};

/**
 * Şifre validasyonu
 * @param {string} password - Şifre
 * @param {boolean} isRegistration - Kayıt mı?
 * @returns {Object} - {valid, error}
 */
export const validatePassword = (password, isRegistration = false) => {
  if (!password || !password.trim()) {
    return { valid: false, error: 'Şifre gerekli!' };
  }
  
  if (isRegistration && password.length < 6) {
    return { valid: false, error: 'Şifre en az 6 karakter olmalı!' };
  }
  
  return { valid: true };
};

/**
 * Tüm login formu validasyonu
 * @param {Object} formData - Form verileri
 * @returns {Object} - {valid, error}
 */
export const validateLoginForm = (formData) => {
  const usernameValidation = validateUsername(formData.username);
  if (!usernameValidation.valid) {
    return usernameValidation;
  }
  
  const passwordValidation = validatePassword(formData.password, false);
  if (!passwordValidation.valid) {
    return passwordValidation;
  }
  
  return { valid: true };
};

/**
 * Tüm kayıt formu validasyonu
 * @param {Object} formData - Form verileri
 * @returns {Object} - {valid, error}
 */
export const validateRegisterForm = (formData) => {
  const usernameValidation = validateUsername(formData.username);
  if (!usernameValidation.valid) {
    return usernameValidation;
  }
  
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }
  
  const passwordValidation = validatePassword(formData.password, true);
  if (!passwordValidation.valid) {
    return passwordValidation;
  }
  
  return { valid: true };
};
