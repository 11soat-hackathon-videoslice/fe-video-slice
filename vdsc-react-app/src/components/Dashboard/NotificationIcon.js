import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../../services/notificationService';
import './NotificationIcon.css';

const NotificationIcon = ({ onNewNotification, onNotificationRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0) return;

    try {
      console.log('NotificationIcon: Marcando todas as notificações como lidas...');
      // Chama markAsRead para cada notificação
      const promises = notifications.map(notification =>
        notificationService.markAsRead(notification.id, notification.timestamp)
      );

      await Promise.all(promises);

      // Remove todas as notificações da listagem
      setNotifications([]);
      updateUnreadCount([]);

      console.log('NotificationIcon: Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
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

  return (
    <div className="notification-container" ref={dropdownRef}>
      <button
        className="notification-icon-btn"
        onClick={handleToggleDropdown}
        aria-label="Notificações"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notificações</h3>
            <div className="notification-header-buttons">
              {notifications.length > 0 && (
                <>
                  <button
                    className="btn-mark-all-read"
                    onClick={handleMarkAllAsRead}
                    title="Marcar todas como lidas"
                  >
                    ✓ Lido
                  </button>
                  <button
                    className="btn-refresh-notifications"
                    onClick={loadNotifications}
                    disabled={loading}
                  >
                    🔄
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">
                <div className="spinner-small"></div>
                <p>Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notification-content" onClick={() => handleMarkAsRead(notification)}>
                    <p className="notification-message">{notification.message}</p>
                    {notification.fileName && (
                      <p className="notification-filename">📁 {notification.fileName}</p>
                    )}
                    <span className="notification-time">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  <button
                    className="notification-close-btn"
                    onClick={() => handleMarkAsRead(notification)}
                    title="Marcar como lido"
                    aria-label="Fechar notificação"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationIcon;

