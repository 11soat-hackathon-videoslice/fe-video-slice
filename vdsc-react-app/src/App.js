import React, { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

function App() {
  const [authState, setAuthState] = useState('loading'); // loading, login, register, forgotPassword, authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
      setAuthState('authenticated');
    } catch (err) {
      setIsAuthenticated(false);
      setAuthState('login');
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setAuthState('authenticated');
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setAuthState('login');
  };

  if (authState === 'loading') {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard onSignOut={handleSignOut} />;
  }

  if (authState === 'register') {
    return (
      <Register 
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={() => setAuthState('login')}
      />
    );
  }

  if (authState === 'forgotPassword') {
    return (
      <ForgotPassword 
        onSwitchToLogin={() => setAuthState('login')}
      />
    );
  }

  return (
    <Login 
      onSuccess={handleAuthSuccess}
      onSwitchToRegister={() => setAuthState('register')}
      onSwitchToForgotPassword={() => setAuthState('forgotPassword')}
    />
  );
}

export default App;
