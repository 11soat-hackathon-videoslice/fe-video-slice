import React, { useState } from 'react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
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

const ForgotPassword = ({ onSwitchToLogin }) => {
  const theme = useTheme();
  const [step, setStep] = useState('request'); // 'request' or 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

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

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword({ username: email });
      setStep('reset');
      setSuccess('Código de verificação enviado para seu e-mail!');
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(err.message || 'Erro ao solicitar redefinição de senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword
      });
      
      setSuccess('Senha redefinida com sucesso!');
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (err) {
      console.error('Password reset confirmation error:', err);
      setError(err.message || 'Erro ao redefinir senha. Verifique o código.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'reset') {
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
            <Box sx={{ textAlign: 'center', mb: 3 }}>
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
                  mb: 1.5,
                }}
              >
                Redefinir Senha
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Digite o código enviado para <strong>{email}</strong> e sua nova senha
              </Typography>
            </Box>

            <form onSubmit={handleConfirmReset}>
              <Stack spacing={1.2} sx={{ mb: 1.5 }}>
                <TextField
                  fullWidth
                  id="code"
                  label="Código de Verificação"
                  type="text"
                  size="small"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="123456"
                  inputProps={{ maxLength: 6 }}
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-root': {
                      height: 40,
                    },
                  }}
                />

                <TextField
                  fullWidth
                  id="newPassword"
                  label="Nova Senha"
                  type="password"
                  size="small"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  label="Confirmar Nova Senha"
                  type="password"
                  size="small"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

                {success && (
                  <Alert severity="success" onClose={() => setSuccess('')} sx={{ py: 0.8 }}>
                    {success}
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
                  {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                </Button>
              </Stack>
            </form>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                variant="caption"
                onClick={onSwitchToLogin}
                sx={{ cursor: 'pointer', fontSize: '0.85rem' }}
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
                mb: 1.5,
              }}
            >
              Esqueci minha Senha
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Digite seu e-mail para receber um código de verificação
            </Typography>
          </Box>

          <form onSubmit={handleRequestReset}>
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

              {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.8 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" onClose={() => setSuccess('')} sx={{ py: 0.8 }}>
                  {success}
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
                {loading ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </Stack>
          </form>

          <Box sx={{ textAlign: 'center' }}>
            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={onSwitchToLogin}
              sx={{ cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Voltar para login
            </Link>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
