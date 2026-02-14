import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import Dashboard from './Dashboard';
import { videoAPI } from '../../services/api';

// Mock do api
jest.mock('../../services/api', () => ({
  videoAPI: {
    getVideos: jest.fn(),
    downloadVideo: jest.fn(),
  },
}));

// Mock dos componentes filhos
jest.mock('./VideoTable', () => {
  return function MockVideoTable({ videos, loading, onDownload, onViewLogs }) {
    return (
      <div data-testid="video-table">
        {loading && <span>Loading...</span>}
        {videos.map(v => (
          <div key={v.id} data-testid={`video-${v.id}`}>
            <span>{v.fileName}</span>
            <button onClick={() => onDownload(v)} data-testid={`download-${v.id}`}>Download</button>
            <button onClick={() => onViewLogs(v)} data-testid={`logs-${v.id}`}>Logs</button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('./UploadModal', () => {
  return function MockUploadModal({ onClose, onSuccess }) {
    return (
      <div data-testid="upload-modal">
        <button onClick={onClose} data-testid="close-upload">Close</button>
        <button onClick={onSuccess} data-testid="upload-success">Upload Success</button>
      </div>
    );
  };
});

jest.mock('./LogsModal', () => {
  return function MockLogsModal({ video, onClose }) {
    return (
      <div data-testid="logs-modal">
        <span>Logs for: {video.fileName}</span>
        <button onClick={onClose} data-testid="close-logs">Close</button>
      </div>
    );
  };
});

// Mock do NotificationIcon para capturar os callbacks
let capturedOnNewNotification = null;
let capturedOnNotificationRead = null;

jest.mock('./NotificationIcon', () => {
  return function MockNotificationIcon({ onNewNotification, onNotificationRead }) {
    capturedOnNewNotification = onNewNotification;
    capturedOnNotificationRead = onNotificationRead;
    return (
      <div data-testid="notification-icon">
        <button
          onClick={() => onNewNotification && onNewNotification({ id: 'test-notification' })}
          data-testid="trigger-new-notification"
        >
          New Notification
        </button>
        <button
          onClick={() => onNotificationRead && onNotificationRead({ id: 'test-notification' })}
          data-testid="trigger-notification-read"
        >
          Read Notification
        </button>
      </div>
    );
  };
});

describe('Dashboard Component', () => {
  const mockOnSignOut = jest.fn();
  const mockVideos = [
    { id: 1, fileName: 'video1.mp4', status: 'FINISHED', logs: [] },
    { id: 2, fileName: 'video2.mp4', status: 'PROCESSING', logs: [] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    fetchUserAttributes.mockResolvedValue({ name: 'Test User', email: 'test@example.com' });
    videoAPI.getVideos.mockResolvedValue(mockVideos);
  });

  const renderDashboard = () => {
    return render(<Dashboard onSignOut={mockOnSignOut} />);
  };

  describe('Renderização', () => {
    it('deve renderizar o header com nome do usuário', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/olá, test user/i)).toBeInTheDocument();
      });
    });

    it('deve renderizar título do dashboard', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/video slice - dashboard/i)).toBeInTheDocument();
      });
    });

    it('deve usar email quando name não está disponível', async () => {
      fetchUserAttributes.mockResolvedValue({ email: 'test@example.com' });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/olá, test@example.com/i)).toBeInTheDocument();
      });
    });

    it('deve usar "Usuário" como fallback', async () => {
      fetchUserAttributes.mockResolvedValue({});
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/olá, usuário/i)).toBeInTheDocument();
      });
    });
  });

  describe('Carregamento de vídeos', () => {
    it('deve carregar vídeos na inicialização', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalled();
        expect(screen.getByTestId('video-table')).toBeInTheDocument();
      });
    });

    it('deve exibir erro quando API falha', async () => {
      videoAPI.getVideos.mockRejectedValue(new Error('API Error'));
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar vídeos/i)).toBeInTheDocument();
      });
    });

    it('deve recarregar vídeos ao clicar em Atualizar', async () => {
      renderDashboard();

      // Aguarda o carregamento inicial completar
      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('video-table')).toBeInTheDocument();
      });

      // Aguarda o botão estar habilitado (loading = false)
      const refreshButton = screen.getByText(/atualizar/i);
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });

      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Sign Out', () => {
    it('deve fazer sign out ao clicar no botão', async () => {
      signOut.mockResolvedValue({});
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/olá, test user/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /sair/i }));
      await waitFor(() => {
        expect(signOut).toHaveBeenCalled();
        expect(mockOnSignOut).toHaveBeenCalled();
      });
    });
  });

  describe('Upload Modal', () => {
    it('deve abrir modal de upload', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('video-table')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/upload novo vídeo/i));
      expect(screen.getByTestId('upload-modal')).toBeInTheDocument();
    });

    it('deve fechar modal de upload', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('video-table')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/upload novo vídeo/i));
      expect(screen.getByTestId('upload-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-upload'));
      expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
    });

    it('deve recarregar vídeos após upload bem sucedido', async () => {
      renderDashboard();

      // Aguarda o carregamento inicial completar
      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('video-table')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/upload novo vídeo/i));
      fireEvent.click(screen.getByTestId('upload-success'));

      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(2);
        expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Logs Modal', () => {
    it('deve abrir modal de logs', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('video-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('logs-1'));
      expect(screen.getByTestId('logs-modal')).toBeInTheDocument();
      expect(screen.getByText(/logs for: video1.mp4/i)).toBeInTheDocument();
    });

    it('deve fechar modal de logs', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('video-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('logs-1'));
      expect(screen.getByTestId('logs-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-logs'));
      expect(screen.queryByTestId('logs-modal')).not.toBeInTheDocument();
    });
  });

  describe('Download', () => {
    it('deve chamar downloadVideo ao clicar em download', async () => {
      videoAPI.downloadVideo.mockResolvedValue({ success: true });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('video-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('download-1'));
      await waitFor(() => {
        expect(videoAPI.downloadVideo).toHaveBeenCalledWith('test.zip');
      });
    });

    it('deve exibir alerta quando download falha', async () => {
      videoAPI.downloadVideo.mockRejectedValue(new Error('Download failed'));
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByTestId('video-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('download-1'));
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Erro ao baixar vídeo. Tente novamente.');
      });
    });
  });

  describe('Notificações', () => {
    it('deve recarregar vídeos quando nova notificação é recebida', async () => {
      renderDashboard();

      // Aguarda o carregamento inicial completar
      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('video-table')).toBeInTheDocument();
      });

      // Simula nova notificação via mock do NotificationIcon
      fireEvent.click(screen.getByTestId('trigger-new-notification'));

      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(2);
      });
    });

    it('deve renderizar NotificationIcon com callbacks corretos', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
      });

      // Verifica que os callbacks foram passados
      expect(capturedOnNewNotification).toBeDefined();
      expect(capturedOnNotificationRead).toBeDefined();
    });

    it('deve tratar callback de notificação lida', async () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('video-table')).toBeInTheDocument();
      });

      // Simula notificação marcada como lida
      fireEvent.click(screen.getByTestId('trigger-notification-read'));

      await waitFor(() => {
        expect(consoleLog).toHaveBeenCalledWith(
          'Notificação marcada como lida:',
          expect.objectContaining({ id: 'test-notification' })
        );
      });

      consoleLog.mockRestore();
    });
  });
});
