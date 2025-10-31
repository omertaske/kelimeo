import React from 'react';

const RegisterForm = ({ formData, onChange, onSubmit, loading, error }) => {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="username">👤 Kullanıcı Adı</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={onChange}
          placeholder="Kullanıcı adınızı girin"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">📧 E-mail</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          placeholder="E-mail adresinizi girin"
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
        {loading ? '⏳ İşleniyor...' : '🎯 Üye Ol'}
      </button>
    </form>
  );
};

export default RegisterForm;
