import React, { useState } from 'react';
import { signIn } from 'aws-amplify/auth';
import {
  Container,
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Link,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Login = ({ onSuccess, onSwitchToRegister, onSwitchToForgotPassword }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn({
        username: email,
        password: password
      });
      onSuccess();
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        py: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box
              component="img"
              src="logo.png"
              alt="Video Slice"
              sx={{
                width: 120,
                height: 120,
                objectFit: 'contain',
                mb: 1.5,
              }}
            />
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                mb: 2,
              }}
            >
              Login
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={1.2} sx={{ mb: 1.5 }}>
              <TextField
                fullWidth
                id="email"
                label="E-mail"
                type="email"
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                autoComplete="email"
                variant="outlined"
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                  },
                }}
              />

              <TextField
                fullWidth
                id="password"
                label="Senha"
                type="password"
                size="small"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                variant="outlined"
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                  },
                }}
              />

              {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.8 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="small"
                disabled={loading}
                sx={{
                  mt: 0.5,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  py: 0.8,
                }}
              >
                {loading ? (
                  <CircularProgress size={18} sx={{ mr: 1 }} />
                ) : null}
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </Stack>
          </form>

          <Stack
            direction="row"
            spacing={0.8}
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.8,
              mt: 1.5,
            }}
          >
            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={onSwitchToForgotPassword}
              sx={{ cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Esqueci minha senha
            </Link>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              |
            </Typography>
            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={onSwitchToRegister}
              sx={{ cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Criar conta
            </Link>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;
