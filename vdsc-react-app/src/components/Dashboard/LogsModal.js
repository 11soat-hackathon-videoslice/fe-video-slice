import React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Typography,
    useTheme
} from '@mui/material';
import {Close as CloseIcon} from '@mui/icons-material';

const LogsModal = ({ video, onClose }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // Ordena logs em ordem crescente de timestamp
  const sortedLogs = video.logs && Array.isArray(video.logs)
    ? [...video.logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{
        py: 0.5,
        background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', my: 0 }}>Logs do Vídeo: {video.fileName}.{video.fileExtension}</Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{
        py: 0.75,
        px: 1,
        bgcolor: isDarkMode ? '#1a1f2e' : 'inherit'
      }}>
        {sortedLogs.length === 0 ? (
          <Box textAlign="center" py={2}>
            <Typography variant="subtitle1" color="textSecondary" sx={{ fontSize: '0.875rem' }}>
              Nenhum log disponível para este vídeo.
            </Typography>
          </Box>
        ) : (
          <Box sx={{
            bgcolor: isDarkMode ? '#242938' : '#ede7f6',
            borderLeft: isDarkMode ? '4px solid #7c3aed' : '4px solid #5a3d9a',
            p: 1
          }}>
            <List dense sx={{ p: 0 }}>
              {sortedLogs.map((log, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ py: 0.5, px: 0 }}>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.8125rem',
                            color: isDarkMode ? '#e5e7eb' : 'inherit'
                          }}
                        >
                          {log.info.replace(/\r\n/g, '\n').replace(/\r/g, '\n')}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.7rem',
                            color: isDarkMode ? '#9ca3af' : 'text.secondary'
                          }}
                        >
                          {formatDate(log.timestamp)}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < sortedLogs.length - 1 && <Divider sx={{
                    my: 0.5,
                    borderColor: isDarkMode ? '#374151' : 'inherit'
                  }} />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{
        py: 0.75,
        px: 1,
        bgcolor: isDarkMode ? '#1a1f2e' : 'inherit'
      }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
            color: 'white',
            fontWeight: 600,
            px: 2,
            py: 0.75,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a3d9a 0%, #4c51bf 100%)',
            }
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogsModal;
