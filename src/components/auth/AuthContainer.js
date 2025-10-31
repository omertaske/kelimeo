import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validateLoginForm, validateRegisterForm } from '../../utils/validation/authValidation';
import FloatingLetters from './FloatingLetters';
import AuthTabs from './AuthTabs';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import DemoButton from './DemoButton';
import '../Auth.css';

const Auth = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleLogin = async () => {
    const validation = validateLoginForm(formData);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    
    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        setError('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Giriş sırasında bir hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const validation = validateRegisterForm(formData);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    
    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      if (result.success) {
        setError('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('Kayıt sırasında bir hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const result = await login('demo', 'demo');
      if (result.success) {
        setError('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Demo girişinde hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <FloatingLetters />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">🎯 Kelimeo Scrabble</h1>
          <p className="auth-subtitle">Türkçe kelime oyununun zirvesi!</p>
        </div>

        <AuthTabs isLogin={isLogin} onTabChange={setIsLogin} />

        {isLogin ? (
          <LoginForm
            formData={formData}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        ) : (
          <RegisterForm
            formData={formData}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        )}

        <DemoButton onClick={handleDemoLogin} loading={loading} />

        <div className="auth-footer">
          <p>
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
            <button 
              type="button"
              className="auth-link"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Üye olun' : 'Giriş yapın'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
