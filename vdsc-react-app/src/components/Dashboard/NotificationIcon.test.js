import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationIcon from './NotificationIcon';
import { notificationService } from '../../services/notificationService';

// Mock do serviço de notificações
jest.mock('../../services/notificationService');

describe('NotificationIcon', () => {
  const mockNotifications = [
    {
      userId: 'user-1',
      timestamp: '2026-02-09T10:00:00Z',
      id: '1',
      message: 'Seu vídeo foi processado com sucesso',
      isRead: false,
      fileName: 'video1.mp4'
    },
    {
      userId: 'user-1',
      timestamp: '2026-02-09T09:00:00Z',
      id: '2',
      message: 'Upload concluído',
      isRead: true,
      fileName: 'video2.mp4'
    }
  ];

  const mockSubscription = {
    unsubscribe: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    notificationService.getNotifications.mockResolvedValue({
      items: mockNotifications,
      nextToken: null
    });

    notificationService.subscribeToNotifications.mockResolvedValue(mockSubscription);
    notificationService.markAsRead.mockResolvedValue({});
  });

  test('deve renderizar o ícone de notificação', async () => {
    render(<NotificationIcon />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument();
    });
  });

  test('deve exibir badge com contagem de notificações não lidas', async () => {
    render(<NotificationIcon />);

    await waitFor(() => {
      const badge = screen.getByText((content, element) => {
        return element?.className === 'notification-badge' && content === '1';
      });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('notification-badge');
    });
  });

  test('não deve exibir badge quando não há notificações não lidas', async () => {
    const readNotifications = mockNotifications.map(n => ({ ...n, isRead: true }));
    notificationService.getNotifications.mockResolvedValue({
      items: readNotifications,
      nextToken: null
    });

    render(<NotificationIcon />);

    await waitFor(() => {
      const badge = screen.queryByText((content, element) => {
        return element?.className === 'notification-badge';
      });
      expect(badge).not.toBeInTheDocument();
    });
  });

  test('deve exibir "99+" quando há mais de 99 notificações não lidas', async () => {
    const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
      userId: 'user-1',
      timestamp: `2026-02-09T${String(i).padStart(2, '0')}:00:00Z`,
      id: String(i),
      message: `Notificação ${i}`,
      isRead: false
    }));

    notificationService.getNotifications.mockResolvedValue({
      items: manyNotifications,
      nextToken: null
    });

    render(<NotificationIcon />);

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  test('deve abrir dropdown ao clicar no ícone', async () => {
    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Notificações')).toBeInTheDocument();
    });
  });

  test('deve fechar dropdown ao clicar no ícone novamente', async () => {
    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });

    // Abre
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Notificações')).toBeInTheDocument();
    });

    // Fecha
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.queryByText('Notificações')).not.toBeInTheDocument();
    });
  });

  test('deve exibir lista de notificações', async () => {
    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Seu vídeo foi processado com sucesso')).toBeInTheDocument();
      expect(screen.getByText('Upload concluído')).toBeInTheDocument();
      expect(screen.getByText('📁 video1.mp4')).toBeInTheDocument();
    });
  });

  test('deve exibir mensagem quando não há notificações', async () => {
    notificationService.getNotifications.mockResolvedValue({
      items: [],
      nextToken: null
    });

    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma notificação')).toBeInTheDocument();
    });
  });

  test('deve exibir loading ao carregar notificações', async () => {
    // Delay na resposta para capturar estado de loading
    notificationService.getNotifications.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ items: [], nextToken: null }), 100))
    );

    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  test('deve marcar notificação como lida ao clicar', async () => {
    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Seu vídeo foi processado com sucesso')).toBeInTheDocument();
    });

    const notification = screen.getByText('Seu vídeo foi processado com sucesso');
    fireEvent.click(notification);

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith(
        'user-1',
        '2026-02-09T10:00:00Z'
      );
    });
  });

  test('não deve chamar markAsRead se notificação já está lida', async () => {
    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Upload concluído')).toBeInTheDocument();
    });

    const notification = screen.getByText('Upload concluído');
    fireEvent.click(notification);

    await waitFor(() => {
      expect(notificationService.markAsRead).not.toHaveBeenCalled();
    });
  });

  test('deve atualizar contagem de não lidas após marcar como lida', async () => {
    render(<NotificationIcon />);

    await waitFor(() => {
      const badge = screen.getByText((content, element) => {
        return element?.className === 'notification-badge' && content === '1';
      });
      expect(badge).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Seu vídeo foi processado com sucesso')).toBeInTheDocument();
    });

    const notification = screen.getByText('Seu vídeo foi processado com sucesso');
    fireEvent.click(notification);

    await waitFor(() => {
      const badge = screen.queryByText((content, element) => {
        return element?.className === 'notification-badge';
      });
      expect(badge).not.toBeInTheDocument();
    });
  });

  test('deve configurar subscrição ao montar componente', async () => {
    render(<NotificationIcon />);

    await waitFor(() => {
      expect(notificationService.subscribeToNotifications).toHaveBeenCalled();
    });
  });

  test('deve limpar subscrição ao desmontar componente', async () => {
    const { unmount } = render(<NotificationIcon />);

    await waitFor(() => {
      expect(notificationService.subscribeToNotifications).toHaveBeenCalled();
    });

    unmount();

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  test('deve adicionar nova notificação via subscrição', async () => {
    let subscriptionCallback;
    notificationService.subscribeToNotifications.mockImplementation((callback) => {
      subscriptionCallback = callback;
      return Promise.resolve(mockSubscription);
    });

    render(<NotificationIcon />);

    await waitFor(() => {
      expect(notificationService.subscribeToNotifications).toHaveBeenCalled();
    });

    // Simula nova notificação via subscrição
    const newNotification = {
      userId: 'user-1',
      timestamp: '2026-02-09T11:00:00Z',
      id: '3',
      message: 'Nova notificação em tempo real',
      isRead: false
    };

    subscriptionCallback(newNotification);

    const button = screen.getByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Nova notificação em tempo real')).toBeInTheDocument();
    });
  });

  test('deve atualizar badge ao receber nova notificação', async () => {
    let subscriptionCallback;
    notificationService.subscribeToNotifications.mockImplementation((callback) => {
      subscriptionCallback = callback;
      return Promise.resolve(mockSubscription);
    });

    render(<NotificationIcon />);

    await waitFor(() => {
      const badge = screen.getByText((content, element) => {
        return element?.className === 'notification-badge' && content === '1';
      });
      expect(badge).toBeInTheDocument();
    });

    // Simula nova notificação não lida
    const newNotification = {
      userId: 'user-1',
      timestamp: '2026-02-09T11:00:00Z',
      id: '3',
      message: 'Nova notificação',
      isRead: false
    };

    subscriptionCallback(newNotification);

    await waitFor(() => {
      const badge = screen.getByText((content, element) => {
        return element?.className === 'notification-badge' && content === '2';
      });
      expect(badge).toBeInTheDocument();
    });
  });

  test('deve recarregar notificações ao clicar no botão de atualizar', async () => {
    render(<NotificationIcon />);

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('🔄')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('🔄');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledTimes(2);
    });
  });

  test('deve formatar timestamp corretamente', async () => {
    // Configura fake timers e define o tempo atual
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2026-02-09T12:00:00Z'));

    const recentNotifications = [
      {
        userId: 'user-1',
        timestamp: '2026-02-09T11:59:00Z', // 1 min atrás
        id: '1',
        message: 'Notificação recente',
        isRead: false
      }
    ];

    notificationService.getNotifications.mockResolvedValue({
      items: recentNotifications,
      nextToken: null
    });

    render(<NotificationIcon />);

    // Aguarda renderização inicial
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('1min atrás')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('deve fechar dropdown ao clicar fora', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <NotificationIcon />
      </div>
    );

    const button = await screen.findByRole('button', { name: /notificações/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Notificações')).toBeInTheDocument();
    });

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    await waitFor(() => {
      expect(screen.queryByText('Notificações')).not.toBeInTheDocument();
    });
  });

  test('deve tratar erro ao carregar notificações', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    notificationService.getNotifications.mockRejectedValue(new Error('Network error'));

    render(<NotificationIcon />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Erro ao carregar notificações:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });
});

