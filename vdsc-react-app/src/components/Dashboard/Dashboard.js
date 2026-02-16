import React, { useState, useEffect } from 'react';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { videoAPI } from '../../services/api';
import VideoTable from './VideoTable';
import UploadModal from './UploadModal';
import LogsModal from './LogsModal';
import NotificationIcon from './NotificationIcon';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  Alert,
  IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const Dashboard = ({ onSignOut }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    loadUserData();
    loadVideos();
  }, []);

  const loadUserData = async () => {
    try {
      const attributes = await fetchUserAttributes();
      setUserName(attributes.name || attributes.email || 'Usuário');
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const loadVideos = async () => {
    console.log('loadVideos called');
    setLoading(true);
    setError('');
    try {
      console.log('Calling videoAPI.getVideos()...');
      const data = await videoAPI.getVideos();
      console.log('Received data:', data);
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Erro ao carregar vídeos. Tente novamente.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    loadVideos();
  };

  const handleDownload = async (video) => {
    try {
      // Format: fileName.zip
      const downloadFileName = `${video.fileName}.zip`;
      await videoAPI.downloadVideo(downloadFileName);
    } catch (err) {
      console.error('Error downloading video:', err);
      alert('Erro ao baixar vídeo. Tente novamente.');
    }
  };

  const handleViewLogs = (video) => {
    setSelectedVideo(video);
    setShowLogsModal(true);
  };

  // Handler chamado quando uma nova notificação é recebida via subscription
  const handleNewNotification = (notification) => {
    console.log('Nova notificação recebida no Dashboard:', notification);
    // Atualiza a tabela de vídeos para refletir mudanças
    loadVideos();
  };

  // Handler chamado quando uma notificação é marcada como lida
  const handleNotificationRead = (notification) => {
    console.log('Notificação marcada como lida:', notification);
    // Pode ser usado para atualizar estado específico se necessário
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
        }}
      >
        <Box sx={{ maxWidth: '80%', mx: 'auto', width: '100%' }}>
          <Toolbar disableGutters sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <img 
                src="/logo_ico.png" 
                alt="Video Slice" 
                style={{ width: 75, height: 75, objectFit: 'contain' }}
              />
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                Video Slice - Dashboard
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Olá, {userName}
              </Typography>
              <NotificationIcon
                onNewNotification={handleNewNotification}
                onNotificationRead={handleNotificationRead}
              />
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleSignOut}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'white',
                    color: '#667eea',
                    borderColor: 'white'
                  }
                }}
              >
                Sair
              </Button>
            </Box>
          </Toolbar>
        </Box>
      </AppBar>

      <Box sx={{ maxWidth: '80%', mx: 'auto', py: 4 }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setShowUploadModal(true)}
            sx={{
              background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
              color: 'white',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              boxShadow: '0 4px 15px rgba(76, 81, 191, 0.3)',

              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
              }
            }}
          >
            Upload Novo Vídeo
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadVideos}
            disabled={loading}
            sx={{
              borderColor: '#5461d0',
              color: '#5461d0',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              '&:hover': {
                bgcolor: '#5461d0',
                color: 'white',
                borderColor: '#5461d0'
              }
            }}
          >
            Atualizar
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <VideoTable 
          videos={videos}
          loading={loading}
          onDownload={handleDownload}
          onViewLogs={handleViewLogs}
        />
      </Box>

      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {showLogsModal && selectedVideo && (
        <LogsModal
          video={selectedVideo}
          onClose={() => setShowLogsModal(false)}
        />
      )}
    </Box>
  );
};

export default Dashboard;
