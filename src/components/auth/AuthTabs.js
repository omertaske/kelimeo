import React from 'react';

const AuthTabs = ({ isLogin, onTabChange }) => {
  return (
    <div className="auth-tabs">
      <button 
        type="button"
        className={`auth-tab ${isLogin ? 'active' : ''}`}
        onClick={() => onTabChange(true)}
      >
        Giriş Yap
      </button>
      <button 
        type="button"
        className={`auth-tab ${isLogin ? '' : 'active'}`}
        onClick={() => onTabChange(false)}
      >
        Üye Ol
      </button>
    </div>
  );
};

export default AuthTabs;
