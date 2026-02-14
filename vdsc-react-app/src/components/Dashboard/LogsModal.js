import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import './LogsModal.css';

const LogsModal = ({ video, onClose }) => {
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
      <DialogTitle sx={{ py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: '1.125rem' }}>Logs do Vídeo: {video.fileName}</Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 1 }}>
        {sortedLogs.length === 0 ? (
          <Box textAlign="center" py={3}>
            <Typography variant="subtitle1" color="textSecondary" sx={{ fontSize: '0.875rem' }}>
              Nenhum log disponível para este vídeo.
            </Typography>
          </Box>
        ) : (
          <List dense>
            {sortedLogs.map((log, index) => (
              <React.Fragment key={index}>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {log.info.replace(/\r\n/g, '\n').replace(/\r/g, '\n')}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                        {formatDate(log.timestamp)}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < sortedLogs.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ py: 1 }}>
        <Button onClick={onClose} color="primary" size="small">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogsModal;
