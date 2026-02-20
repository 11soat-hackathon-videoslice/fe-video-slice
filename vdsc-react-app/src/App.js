import React, {useEffect, useMemo, useState} from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {Box, CircularProgress, CssBaseline, Typography} from '@mui/material';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  const [authState, setAuthState] = useState('loading');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#5a3d9a' },
      secondary: { main: '#4c51bf' },
      ...(darkMode && {
        background: {
          default: '#0d1117',
          paper: '#161b27',
        },
      }),
    },
  }), [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      localStorage.setItem('darkMode', String(!prev));
      return !prev;
    });
  };

  // ...existing code...

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
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
      </ThemeProvider>
    );
  }

  if (isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Dashboard onSignOut={handleSignOut} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
      </ThemeProvider>
    );
  }

  if (authState === 'register') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Register
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthState('login')}
        />
      </ThemeProvider>
    );
  }

  if (authState === 'forgotPassword') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ForgotPassword
          onSwitchToLogin={() => setAuthState('login')}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Login
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={() => setAuthState('register')}
        onSwitchToForgotPassword={() => setAuthState('forgotPassword')}
      />
    </ThemeProvider>
  );
}

export default App;
