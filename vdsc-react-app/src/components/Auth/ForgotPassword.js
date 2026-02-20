import React, {useState} from 'react';
import {confirmResetPassword, resetPassword} from 'aws-amplify/auth';
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

const ForgotPassword = ({ onSwitchToLogin }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const focusColor = isDark ? '#a5b4fc' : '#5a3d9a';
  const fieldSx = { '& .MuiInputBase-root': { height: 40 }, '& label.Mui-focused': { color: focusColor }, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: focusColor, borderWidth: 2 } };
  const btnSx = { mt: 0.5, textTransform: 'none', fontSize: '0.95rem', fontWeight: 600, py: 0.8, background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)', '&:hover': { background: 'linear-gradient(135deg, #5a3d9a 0%, #4c51bf 100%)' } };

  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const validatePassword = (password) => {
    if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'A senha deve conter pelo menos uma letra maiúscula';
    if (!/[a-z]/.test(password)) return 'A senha deve conter pelo menos uma letra minúscula';
    if (!/\d/.test(password)) return 'A senha deve conter pelo menos um número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'A senha deve conter pelo menos um caractere especial';
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
      setError(err.message || 'Erro ao solicitar redefinição de senha.');
    } finally { setLoading(false); }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem'); return; }
    const pwErr = validatePassword(newPassword);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true);
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      setSuccess('Senha redefinida com sucesso!');
      setTimeout(() => onSwitchToLogin(), 2000);
    } catch (err) {
      setError(err.message || 'Erro ao redefinir senha. Verifique o código.');
    } finally { setLoading(false); }
  };

  const logo = (
    <Box sx={{ textAlign: 'center', mb: 2 }}>
      <Box component="img" src="/logo3.png" alt="Video Slice" sx={{ width: 140, height: 140, objectFit: 'contain', mb: 1.5 }} />
    </Box>
  );

  if (step === 'reset') {
    return (
      <Box sx={{ height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)` }}>
        <Container maxWidth="sm">
          <Card elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            {logo}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Redefinir Senha</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Digite o código enviado para <strong>{email}</strong> e sua nova senha
              </Typography>
            </Box>
            <form onSubmit={handleConfirmReset}>
              <Stack spacing={1.2} sx={{ mb: 1.5 }}>
                <TextField fullWidth id="code" label="Código de Verificação" type="text" size="small"
                  value={code} onChange={(e) => setCode(e.target.value)} required placeholder="123456"
                  inputProps={{ maxLength: 6 }} variant="outlined" sx={fieldSx} />
                <TextField fullWidth id="newPassword" label="Nova Senha" type="password" size="small"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="new-password" variant="outlined"
                  helperText="Mín. 8 car.: maiúsc., minúsc., números e especiais"
                  sx={{ ...fieldSx, '& .MuiFormHelperText-root': { fontSize: '0.72rem' } }} />
                <TextField fullWidth id="confirmPassword" label="Confirmar Nova Senha" type="password" size="small"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="new-password" variant="outlined" sx={fieldSx} />
                {error && <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.8 }}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ py: 0.8 }}>{success}</Alert>}
                <Button type="submit" fullWidth variant="contained" size="small" disabled={loading} sx={btnSx}>
                  {loading && <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />}
                  {loading ? 'Redefinindo...' : 'Redefinir Senha'}
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
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>Esqueci minha Senha</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Digite seu e-mail para receber um código de verificação
            </Typography>
          </Box>
          <form onSubmit={handleRequestReset}>
            <Stack spacing={1.2} sx={{ mb: 1.5 }}>
              <TextField fullWidth id="email" label="E-mail" type="email" size="small"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="seu@email.com" autoComplete="email" variant="outlined" sx={fieldSx} />
              {error && <Alert severity="error" onClose={() => setError('')} sx={{ py: 0.8 }}>{error}</Alert>}
              {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ py: 0.8 }}>{success}</Alert>}
              <Button type="submit" fullWidth variant="contained" size="small" disabled={loading} sx={btnSx}>
                {loading && <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} />}
                {loading ? 'Enviando...' : 'Enviar Código'}
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
};

export default ForgotPassword;
