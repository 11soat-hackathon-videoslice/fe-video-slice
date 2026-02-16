import React, {useEffect, useState} from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {Box, CircularProgress, Typography} from '@mui/material';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './components/Dashboard/Dashboard';

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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'white' }}>Carregando...</Typography>
      </Box>
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
