import React, {useState} from 'react';
import {autoSignIn, confirmSignUp, signUp} from 'aws-amplify/auth';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {useTheme} from '@mui/material/styles';

const Register = ({ onSuccess, onSwitchToLogin }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const focusColor = isDark ? '#a5b4fc' : '#5a3d9a';
  const fieldSx = { '& .MuiInputBase-root': { height: 40 }, '& label.Mui-focused': { color: focusColor }, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: focusColor, borderWidth: 2 } };
  const btnSx = { mt: 0.5, textTransform: 'none', fontSize: '0.95rem', fontWeight: 600, py: 0.8, background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)', '&:hover': { background: 'linear-gradient(135deg, #5a3d9a 0%, #4c51bf 100%)' } };

  const [step, setStep] = useState('register');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validatePassword = (password) => {
    if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'A senha deve conter pelo menos uma letra maiúscula';
    if (!/[a-z]/.test(password)) return 'A senha deve conter pelo menos uma letra minúscula';
    if (!/\d/.test(password)) return 'A senha deve conter pelo menos um número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'A senha deve conter pelo menos um caractere especial';
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('As senhas não coincidem'); return; }
    const pwErr = validatePassword(formData.password);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true);
    try {
      await signUp({ username: formData.email, password: formData.password, options: { userAttributes: { email: formData.email, name: formData.name }, autoSignIn: true } });
      setStep('confirm');
    } catch (err) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally { setLoading(false); }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp({ username: formData.email, confirmationCode });
      try { await autoSignIn(); onSuccess(); } catch { onSwitchToLogin(); }
    } catch (err) {
      setError(err.message || 'Código inválido. Tente novamente.');
    } finally { setLoading(false); }
  };

  const logoSrc = isDark ? '/logo3.png' : '/logo.png';
  const logo = (
    <Box sx={{ textAlign: 'center', mb: 2 }}>
      <Box component="img" src={logoSrc} alt="Video Slice" sx={{ width: 140, height: 140, objectFit: 'contain', mb: 1.5 }} />
    </Box>
  );

  if (step === 'confirm') {
    return (
      <Box sx={{ height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)` }}>
        <Container maxWidth="sm">
          <Card elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            {logo}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Confirmar E-mail</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Enviamos um código para <strong>{formData.email}</strong>
              </Typography>
            </Box>
            <form onSubmit={handleConfirm}>
              <Stack spacing={1.2} sx={{ mb: 1.5 }}>
                <TextField fullWidth id="confirmationCode" label="Código de Confirmação" type="text" size="small"
                  value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)}
                  required placeholder="123456" inputProps={{ maxLength: 6 }} variant="outlined" sx={fieldSx} />
                {error && <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.8 }}>{error}</Alert>}
                <Button type="submit" fullWidth variant="contained" size="small" disabled={loading} sx={btnSx}>
                  {loading && <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />}
                  {loading ? 'Confirmando...' : 'Confirmar'}
                </Button>
              </Stack>
            </form>
            <Stack direction="row" sx={{ justifyContent: 'center', alignItems: 'center', gap: 0.8, mt: 1.5 }}>
              <Link component="button" type="button" variant="caption" onClick={onSwitchToLogin} sx={{ cursor: 'pointer', fontSize: '0.85rem', color: focusColor }}>
                Voltar para login
              </Link>
            </Stack>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)` }}>
      <Container maxWidth="sm">
        <Card elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          {logo}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Criar Conta</Typography>
          </Box>
          <form onSubmit={handleRegister}>
            <Stack spacing={1.2} sx={{ mb: 1.5 }}>
              <TextField fullWidth id="name" label="Nome Completo" type="text" size="small" name="name"
                value={formData.name} onChange={handleChange} required placeholder="Seu nome completo" autoComplete="name" variant="outlined" sx={fieldSx} />
              <TextField fullWidth id="email" label="E-mail" type="email" size="small" name="email"
                value={formData.email} onChange={handleChange} required placeholder="seu@email.com" autoComplete="email" variant="outlined" sx={fieldSx} />
              <TextField fullWidth id="password" label="Senha" type="password" size="small" name="password"
                value={formData.password} onChange={handleChange} required placeholder="••••••••"
                autoComplete="new-password" variant="outlined"
                helperText="Mín. 8 car.: maiúsc., minúsc., números e especiais"
                sx={{ ...fieldSx, '& .MuiFormHelperText-root': { fontSize: '0.72rem' } }} />
              <TextField fullWidth id="confirmPassword" label="Confirmar Senha" type="password" size="small" name="confirmPassword"
                value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" autoComplete="new-password" variant="outlined" sx={fieldSx} />
              {error && <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.8 }}>{error}</Alert>}
              <Button type="submit" fullWidth variant="contained" size="small" disabled={loading} sx={btnSx}>
                {loading && <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />}
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </Stack>
          </form>
          <Stack direction="row" sx={{ justifyContent: 'center', alignItems: 'center', gap: 0.8, mt: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Já tem uma conta?</Typography>
            <Link component="button" type="button" variant="caption" onClick={onSwitchToLogin} sx={{ cursor: 'pointer', fontSize: '0.85rem', color: focusColor }}>
              Fazer login
            </Link>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
};

export default Register;
