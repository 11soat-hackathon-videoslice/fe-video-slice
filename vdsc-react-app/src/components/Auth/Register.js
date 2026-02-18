import React, { useState } from 'react';
import { signUp, confirmSignUp, autoSignIn } from 'aws-amplify/auth';
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
  FormHelperText,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Register = ({ onSuccess, onSwitchToLogin }) => {
  const theme = useTheme();
  const [step, setStep] = useState('register'); // 'register' or 'confirm'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'A senha deve ter no mínimo 8 caracteres';
    }
    if (!hasUpperCase) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }
    if (!hasLowerCase) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }
    if (!hasNumbers) {
      return 'A senha deve conter pelo menos um número';
    }
    if (!hasSpecialChar) {
      return 'A senha deve conter pelo menos um caractere especial';
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            name: formData.name
          },
          autoSignIn: true
        }
      });

      setStep('confirm');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp({
        username: formData.email,
        confirmationCode: confirmationCode
      });

      // Try auto sign in
      try {
        await autoSignIn();
        onSuccess();
      } catch (autoSignInError) {
        console.log('Auto sign-in failed, redirecting to login');
        onSwitchToLogin();
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm') {
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
              p: 4,
              borderRadius: 2,
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                component="img"
                src="/logo.png"
                alt="Video Slice"
                sx={{
                  width: 180,
                  height: 180,
                  objectFit: 'contain',
                  mb: 2,
                }}
              />
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  mb: 2,
                }}
              >
                Confirmar E-mail
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                Enviamos um código de confirmação para <strong>{formData.email}</strong>
              </Typography>
            </Box>

            <form onSubmit={handleConfirm}>
              <Stack spacing={2} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  id="confirmationCode"
                  label="Código de Confirmação"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                  placeholder="123456"
                  inputProps={{ maxLength: 6 }}
                  variant="outlined"
                />

                {error && (
                  <Alert severity="error" onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 1,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                  ) : null}
                  {loading ? 'Confirmando...' : 'Confirmar'}
                </Button>
              </Stack>
            </form>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={onSwitchToLogin}
                sx={{ cursor: 'pointer' }}
              >
                Voltar para login
              </Link>
            </Box>
          </Card>
        </Container>
      </Box>
    );
  }

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
              src="/logo.png"
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
              Criar Conta
            </Typography>
          </Box>

          <form onSubmit={handleRegister}>
            <Stack spacing={1.2} sx={{ mb: 1.5 }}>
              <TextField
                fullWidth
                id="name"
                label="Nome Completo"
                type="text"
                size="small"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Seu nome completo"
                autoComplete="name"
                variant="outlined"
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                  },
                }}
              />

              <TextField
                fullWidth
                id="email"
                label="E-mail"
                type="email"
                size="small"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                variant="outlined"
                helperText="Mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais"
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                  },
                  '& .MuiFormHelperText-root': {
                    fontSize: '0.75rem',
                  },
                }}
              />

              <TextField
                fullWidth
                id="confirmPassword"
                label="Confirmar Senha"
                type="password"
                size="small"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                autoComplete="new-password"
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
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </Stack>
          </form>

          <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'center', alignItems: 'center', gap: 0.8 }}>
            <Typography variant="caption">Já tem uma conta?</Typography>
            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={onSwitchToLogin}
              sx={{ cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Fazer login
            </Link>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
};

export default Register;
