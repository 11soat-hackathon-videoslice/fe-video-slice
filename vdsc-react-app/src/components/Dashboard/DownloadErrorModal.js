import React from 'react';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import {Close as CloseIcon, Error as ErrorIcon} from '@mui/icons-material';

const DownloadErrorModal = ({ open, onClose, error, videoName }) => {
  const getErrorMessage = (error) => {
    if (!error) {
      return {
        title: 'Erro ao Baixar',
        message: 'Ocorreu um erro inesperado ao tentar baixar o vídeo.',
        suggestion: 'Tente novamente em alguns momentos.'
      };
    }

    const errorString = error.toString().toLowerCase();

    if (errorString.includes('network') || errorString.includes('timeout')) {
      return {
        title: 'Erro de Conexão',
        message: 'Não foi possível estabelecer conexão com o servidor.',
        suggestion: 'Verifique sua conexão com a internet e tente novamente.'
      };
    }

    if (errorString.includes('401') || errorString.includes('unauthorized')) {
      return {
        title: 'Não Autorizado',
        message: 'Sua sessão expirou ou você não tem permissão para baixar este vídeo.',
        suggestion: 'Faça login novamente e tente baixar o vídeo.'
      };
    }

    if (errorString.includes('404') || errorString.includes('not found')) {
      return {
        title: 'Vídeo Não Encontrado',
        message: 'O vídeo que você está tentando baixar não foi encontrado.',
        suggestion: 'O arquivo pode ter sido deletado ou movido. Verifique o estado do vídeo.'
      };
    }

    if (errorString.includes('storage') || errorString.includes('quota')) {
      return {
        title: 'Espaço Insuficiente',
        message: 'Não há espaço disponível para realizar o download.',
        suggestion: 'Libere espaço no seu dispositivo e tente novamente.'
      };
    }

    if (errorString.includes('processing') || errorString.includes('not finished')) {
      return {
        title: 'Processamento Ainda em Andamento',
        message: 'O vídeo ainda está sendo processado.',
        suggestion: 'Aguarde o processamento ser concluído e tente novamente.'
      };
    }

    return {
      title: 'Erro ao Baixar',
      message: error.message || 'Ocorreu um erro inesperado ao tentar baixar o vídeo.',
      suggestion: 'Tente novamente mais tarde ou entre em contato com o suporte.'
    };
  };

  const errorInfo = getErrorMessage(error);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          border: '1px solid rgba(76, 81, 191, 0.1)'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: '#fff5f5',
          borderBottom: '2px solid #FED7D7',
          py: 2,
          px: 3
        }}
      >
        <ErrorIcon sx={{ color: '#C53030', fontSize: '28px' }} />
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#742A2A', flex: 1 }}>
          {errorInfo.title}
        </Typography>
        <CloseIcon
          onClick={onClose}
          sx={{
            cursor: 'pointer',
            fontSize: '24px',
            color: '#718096',
            '&:hover': {
              color: '#2d3748',
              transform: 'rotate(90deg)',
              transition: 'all 0.2s ease'
            }
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ py: 3, px: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Video Name */}
          {videoName && (
            <Alert
              severity="info"
              sx={{
                bgcolor: '#EBF8FF',
                color: '#2C5282',
                '& .MuiAlert-icon': {
                  color: '#2C5282'
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>Vídeo</AlertTitle>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {videoName}
              </Typography>
            </Alert>
          )}

          {/* Error Message */}
          <Box>
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.95rem',
                color: '#2d3748',
                lineHeight: 1.6,
                mb: 1.5
              }}
            >
              {errorInfo.message}
            </Typography>

            <Alert
              severity="warning"
              sx={{
                bgcolor: '#FFFAF0',
                color: '#7C2D12',
                border: '1px solid #FDBA74',
                '& .MuiAlert-icon': {
                  color: '#EA580C'
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>Sugestão</AlertTitle>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {errorInfo.suggestion}
              </Typography>
            </Alert>
          </Box>

          {/* Additional Error Details */}
          {error && error.message && (
            <Box
              sx={{
                bgcolor: '#F7FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                p: 1.5,
                maxHeight: '120px',
                overflowY: 'auto'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: '#718096',
                  fontWeight: 600,
                  mb: 0.5
                }}
              >
                Detalhes Técnicos:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: '#4a5568',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {error.message}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          display: 'flex',
          gap: 1,
          px: 3,
          py: 2,
          bgcolor: '#F7FAFC',
          borderTop: '1px solid #E2E8F0',
          justifyContent: 'flex-end'
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a3d9a 0%, #4c51bf 100%)',
              boxShadow: '0 4px 12px rgba(76, 81, 191, 0.4)'
            }
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DownloadErrorModal;

