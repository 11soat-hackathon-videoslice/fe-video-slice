import React, {useEffect, useRef, useState} from 'react';
import {notificationService} from '../../services/notificationService';
import {
    Badge,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    Notifications as NotificationsIcon,
    NotificationsNone as NotificationsNoneIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

const NotificationIcon = ({ onNewNotification, onNotificationRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const dropdownRef = useRef(null);
  const subscriptionRef = useRef(null);
  const notificationSoundRef = useRef(null);

  // Inicializa o áudio uma única vez
  useEffect(() => {
    const audio = new Audio('/sounds/pop.mp3');
    audio.preload = 'auto';
    notificationSoundRef.current = audio;
  }, []);

  useEffect(() => {
    console.log('NotificationIcon: useEffect - Componente montado, chamando loadNotifications');
    loadNotifications();
    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('NotificationIcon: Carregando notificações não lidas...');
      // Carrega apenas notificações não lidas (isRead: false)
      const result = await notificationService.getNotifications(20, false);
      console.log('NotificationIcon: Notificações carregadas:', result?.items?.length || 0, 'notificações');
      setNotifications(result.items || []);
      updateUnreadCount(result.items || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      // Se for erro de autenticação, tenta novamente após 1 segundo
      if (error.message && error.message.includes('não autenticado')) {
        console.log('NotificationIcon: Tentando carregar notificações novamente em 1 segundo...');
        setTimeout(() => {
          loadNotifications();
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const setupSubscription = async () => {
    try {
      subscriptionRef.current = await notificationService.subscribeToNotifications(
        (newNotification) => {
          console.log('Nova notificação recebida:', newNotification);
          setNotifications(prev => {
            // Verifica se a notificação já existe para evitar duplicatas
            const notificationExists = prev.some(n => n.id === newNotification.id);
            if (notificationExists) {
              console.log('Notificação duplicada ignorada:', newNotification.id);
              return prev;
            }
            const updated = [newNotification, ...prev];
            updateUnreadCount(updated);
            playNotificationSound();

            return updated;
          });
          // Notifica o Dashboard para atualizar a tabela de vídeos
          if (onNewNotification) {
            onNewNotification(newNotification);
          }
        },
        (error) => {
          console.error('Erro na subscrição:', error);
          // Se for erro de autenticação, tenta novamente após 2 segundos
          if (error.message && error.message.includes('não autenticado')) {
            console.log('NotificationIcon: Retentando subscrição em 2 segundos...');
            setTimeout(() => {
              setupSubscription();
            }, 2000);
          }
        }
      );
    } catch (error) {
      console.error('Erro ao configurar subscrição:', error);
      // Se for erro de autenticação, tenta novamente após 2 segundos
      if (error.message && error.message.includes('não autenticado')) {
        console.log('NotificationIcon: Retentando subscrição em 2 segundos...');
        setTimeout(() => {
          setupSubscription();
        }, 2000);
      }
    }
  };

  const updateUnreadCount = (notificationList) => {
    const count = notificationList.filter(n => !n.isRead).length;
    setUnreadCount(count);
  };

  const playNotificationSound = () => {
    try {
      if (notificationSoundRef.current) {
        // Reset o áudio para poder tocar novamente imediatamente
        notificationSoundRef.current.currentTime = 0;
        const playPromise = notificationSoundRef.current.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('🔊 Som de notificação tocado com sucesso');
            })
            .catch(error => {
              console.warn('⚠️ Não foi possível tocar o som. O navegador pode ter bloqueado o autoplay.', error);
            });
        }
      }
    } catch (error) {
      console.warn('❌ Erro ao tentar tocar som de notificação:', error);
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) return;

    try {
      // Chama markAsRead com id e timestamp
      await notificationService.markAsRead(notification.id, notification.timestamp);

      // Remove a notificação da listagem após sucesso
      setNotifications(prev =>
        prev.filter(n => n.id !== notification.id)
      );

      // Atualiza o contador de não lidas
      updateUnreadCount(
        notifications.filter(n => n.id !== notification.id)
      );

      // Notifica o Dashboard sobre a leitura da notificação
      if (onNotificationRead) {
        onNotificationRead(notification);
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (notifications.length === 0) return;

    try {
      console.log('NotificationIcon: Apagando todas as notificações...');
      // Chama markAsRead para cada notificação (que as remove)
      const promises = notifications.map(notification =>
        notificationService.markAsRead(notification.id, notification.timestamp)
      );

      await Promise.all(promises);

      // Remove todas as notificações da listagem
      setNotifications([]);
      updateUnreadCount([]);

      console.log('NotificationIcon: Todas as notificações foram apagadas');
    } catch (error) {
      console.error('Erro ao apagar todas as notificações:', error);
    }
  };

  const handleToggleDropdown = (event) => {
    setAnchorEl(event.currentTarget);
    setShowDropdown(!showDropdown);
  };

  const handleCloseDropdown = () => {
    setAnchorEl(null);
    setShowDropdown(false);
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `${diffMins}min atrás`;
      if (diffHours < 24) return `${diffHours}h atrás`;
      if (diffDays < 7) return `${diffDays}d atrás`;

      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return timestamp;
    }
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      'uploaded': { bg: '#CE93D8', color: '#4A148C', label: 'Carregado' },
      'processing': { bg: '#CE93D8', color: '#4A148C', label: 'Processando' },
      'finished': { bg: '#A5D6A7', color: '#1B5E20', label: 'Concluído' },
      'failed': { bg: '#EF9A9A', color: '#B71C1C', label: 'Falhou' },
      'retrying': { bg: '#FFF176', color: '#E65100', label: 'Retentativa Agendada' }
    };

    const style = statusStyles[status?.toLowerCase()] || { bg: '#F5F5F5', color: '#424242', label: status };
    return style;
  };

  return (
    <Box>
      <IconButton
        onClick={handleToggleDropdown}
        aria-label="Notificações"
        sx={{ color: 'white' }}
      >
        <Badge badgeContent={unreadCount > 99 ? '99+' : unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={showDropdown}
        onClose={handleCloseDropdown}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        PaperProps={{
          sx: {
            width: 450,
            maxHeight: 450,
            m: 0,
            p: 0,
            '& .MuiList-root': {
              p: 0
            }
          }
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)' }}>
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>Notificações</Typography>
          <Box>
            {notifications.length > 0 && (
              <>
                <Button
                  onClick={handleDeleteAllNotifications}
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  sx={{
                    mr: 0.5,
                    fontSize: '0.7rem',
                    py: 0.25,
                    px: 1,
                    bgcolor: '#fff',
                    color: '#4c51bf',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#f0f0f0',
                      color: '#5a3d9a'
                    }
                  }}
                >
                  Apagar Todas
                </Button>
                <IconButton
                  onClick={loadNotifications}
                  disabled={loading}
                  size="small"
                  sx={{ p: 0.5 }}
                >
                  {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <NotificationsNoneIcon fontSize="small" sx={{ color: '#fff' }} />}
                </IconButton>
              </>
            )}
          </Box>
        </Box>


        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" sx={{ ml: 1, fontSize: '0.875rem' }}>Carregando...</Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Nenhuma notificação
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleMarkAsRead(notification)}
              sx={{
                py: 1,
                px: 1.5,
                bgcolor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                borderLeft: '4px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#f3f4f6',
                  borderLeft: '4px solid #4c51bf'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {notification.type === 'success' && <CheckCircleIcon color="success" fontSize="small" />}
                {notification.type === 'error' && <ErrorIcon color="error" fontSize="small" />}
                {notification.type === 'info' && <InfoIcon color="info" fontSize="small" />}
                {notification.type === 'warning' && <WarningIcon color="warning" fontSize="small" />}
              </ListItemIcon>
              <Box sx={{ flex: 1 }}>
                <ListItemText
                  primary={notification.message}
                  secondary={formatTimestamp(notification.timestamp)}
                  primaryTypographyProps={{ variant: 'body2', fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ variant: 'caption', fontSize: '0.7rem' }}
                />
              </Box>
              {notification.status && (
                <Chip
                  label={getStatusStyle(notification.status).label}
                  size="small"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: getStatusStyle(notification.status).bg,
                    color: getStatusStyle(notification.status).color,
                    border: 'none'
                  }}
                />
              )}
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
};

export default NotificationIcon;

