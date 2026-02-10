import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../../services/notificationService';
import './NotificationIcon.css';

const NotificationIcon = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
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
      const result = await notificationService.getNotifications(20);
      setNotifications(result.items || []);
      updateUnreadCount(result.items || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
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
            const updated = [newNotification, ...prev];
            updateUnreadCount(updated);
            return updated;
          });
        },
        (error) => {
          console.error('Erro na subscrição:', error);
        }
      );
    } catch (error) {
      console.error('Erro ao configurar subscrição:', error);
    }
  };

  const updateUnreadCount = (notificationList) => {
    const count = notificationList.filter(n => !n.isRead).length;
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) return;

    try {
      await notificationService.markAsRead(notification.userId, notification.timestamp);

      setNotifications(prev =>
        prev.map(n =>
          n.userId === notification.userId && n.timestamp === notification.timestamp
            ? { ...n, isRead: true }
            : n
        )
      );

      updateUnreadCount(
        notifications.map(n =>
          n.userId === notification.userId && n.timestamp === notification.timestamp
            ? { ...n, isRead: true }
            : n
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
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
            {notifications.length > 0 && (
              <button
                className="btn-refresh-notifications"
                onClick={loadNotifications}
                disabled={loading}
              >
                🔄
              </button>
            )}
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
                  key={`${notification.userId}-${notification.timestamp}`}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    {notification.fileName && (
                      <p className="notification-filename">📁 {notification.fileName}</p>
                    )}
                    <span className="notification-time">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  {!notification.isRead && (
                    <div className="notification-unread-indicator"></div>
                  )}
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

