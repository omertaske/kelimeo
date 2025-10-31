import React from 'react';

const LoginForm = ({ formData, onChange, onSubmit, loading, error }) => {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="username">
          👤 Kullanıcı Adı veya E-mail
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={onChange}
          placeholder="Kullanıcı adı veya e-mail girin"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">🔒 Şifre</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={onChange}
          placeholder="Şifrenizi girin"
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <button 
        type="submit" 
        className="auth-button primary"
        disabled={loading}
      >
        {loading ? '⏳ İşleniyor...' : '🚀 Giriş Yap'}
      </button>
    </form>
  );
};

export default LoginForm;
