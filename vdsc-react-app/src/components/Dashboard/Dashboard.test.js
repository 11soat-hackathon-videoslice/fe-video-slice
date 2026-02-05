import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { videoAPI } from '../../services/api';

// Mock dependencies
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('../../services/api', () => ({
  videoAPI: {
    getVideos: jest.fn(),
    deleteVideo: jest.fn()
  }
}));

const { getCurrentUser, signOut } = require('aws-amplify/auth');

// Mock UploadModal and LogsModal
jest.mock('./UploadModal', () => {
  return function DummyUploadModal({ onClose, onSuccess }) {
    return (
      <div data-testid="upload-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Success</button>
      </div>
    );
  };
});

jest.mock('./LogsModal', () => {
  return function DummyLogsModal({ onClose, video }) {
    return (
      <div data-testid="logs-modal">
        <span>{video?.id}</span>
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  };
});

describe('Dashboard Component', () => {
  const mockUser = {
    userId: 'test-user-123',
    username: 'testuser'
  };

  const mockVideos = [
    {
      id: 1,
      fileName: 'video1.mp4',
      quality: 'ultra',
      status: 'completed',
      uploadedAt: '2026-01-13T10:00:00Z',
      processedAt: '2026-01-13T10:30:00Z'
    },
    {
      id: 2,
      fileName: 'video2.mp4',
      quality: 'high',
      status: 'processing',
      uploadedAt: '2026-01-13T11:00:00Z',
      processedAt: null
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue(mockUser);
    videoAPI.getVideos.mockResolvedValue(mockVideos);
  });

  describe('Rendering', () => {
    it('deve renderizar o componente Dashboard corretamente', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Video Slice/i)).toBeInTheDocument();
      });
    });

    it('deve exibir botão de logout', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      });
    });

    it('deve exibir botão para novo upload', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /novo upload/i })).toBeInTheDocument();
      });
    });

    it('deve exibir filtros de vídeo', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Filtros/i)).toBeInTheDocument();
      });
    });

    it('deve exibir tabela de vídeos', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/video1.mp4/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Information', () => {
    it('deve exibir o username do usuário logado', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/testuser/i)).toBeInTheDocument();
      });
    });

    it('deve buscar informações do usuário ao montar', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(getCurrentUser).toHaveBeenCalled();
      });
    });
  });

  describe('Videos List', () => {
    it('deve listar os vídeos retornados pela API', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
        expect(screen.getByText('video2.mp4')).toBeInTheDocument();
      });
    });

    it('deve exibir status dos vídeos', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });
    });

    it('deve exibir qualidade dos vídeos', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/ultra/i)).toBeInTheDocument();
        expect(screen.getByText(/high/i)).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem quando não há vídeos', async () => {
      videoAPI.getVideos.mockResolvedValue([]);

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhum vídeo/i)).toBeInTheDocument();
      });
    });

    it('deve carregar vídeos novamente ao montar', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalled();
      });
    });
  });

  describe('Upload Modal', () => {
    it('deve abrir modal de upload ao clicar no botão', async () => {
      render(<Dashboard />);

      const uploadButton = await screen.findByRole('button', { name: /novo upload/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('upload-modal')).toBeInTheDocument();
      });
    });

    it('deve fechar modal de upload ao clicar no botão de fechar', async () => {
      render(<Dashboard />);

      const uploadButton = await screen.findByRole('button', { name: /novo upload/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('upload-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
      });
    });

    it('deve recarregar vídeos após upload bem-sucedido', async () => {
      render(<Dashboard />);

      const uploadButton = await screen.findByRole('button', { name: /novo upload/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('upload-modal')).toBeInTheDocument();
      });

      const successButton = screen.getByText('Success');
      fireEvent.click(successButton);

      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(2); // Uma no mount, uma após sucesso
      });
    });
  });

  describe('Logs Modal', () => {
    it('deve abrir modal de logs ao clicar em um vídeo', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      });

      const videoRow = screen.getByText('video1.mp4').closest('tr');
      fireEvent.click(videoRow);

      await waitFor(() => {
        expect(screen.getByTestId('logs-modal')).toBeInTheDocument();
      });
    });

    it('deve fechar modal de logs', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      });

      const videoRow = screen.getByText('video1.mp4').closest('tr');
      fireEvent.click(videoRow);

      await waitFor(() => {
        expect(screen.getByTestId('logs-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close Modal', { selector: '[data-testid="logs-modal"] button' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('logs-modal')).not.toBeInTheDocument();
      });
    });

    it('deve passar o vídeo selecionado para o modal de logs', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      });

      const videoRow = screen.getByText('video1.mp4').closest('tr');
      fireEvent.click(videoRow);

      await waitFor(() => {
        const logsModal = screen.getByTestId('logs-modal');
        expect(logsModal).toBeInTheDocument();
        expect(logsModal).toHaveTextContent('1');
      });
    });
  });

  describe('Logout', () => {
    it('deve fazer logout ao clicar no botão', async () => {
      render(<Dashboard />);

      const logoutButton = await screen.findByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(signOut).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('deve exibir mensagem de erro ao falhar em buscar vídeos', async () => {
      const errorMessage = 'Erro ao buscar vídeos';
      videoAPI.getVideos.mockRejectedValue(new Error(errorMessage));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar vídeos/i)).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de erro ao falhar em deletar vídeo', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      });

      videoAPI.deleteVideo.mockRejectedValue(new Error('Erro ao deletar'));

      const deleteButton = screen.getAllByRole('button', { name: /deletar/i })[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Erro ao deletar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Video Deletion', () => {
    it('deve deletar vídeo ao confirmar', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /deletar/i })[0];
      fireEvent.click(deleteButton);

      // Confirma a exclusão
      const confirmButton = await screen.findByRole('button', { name: /confirmar/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(videoAPI.deleteVideo).toHaveBeenCalledWith(1);
      });
    });

    it('deve recarregar vídeos após deletar', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalled();
      });

      const deleteButton = screen.getAllByRole('button', { name: /deletar/i })[0];
      fireEvent.click(deleteButton);

      const confirmButton = await screen.findByRole('button', { name: /confirmar/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(videoAPI.getVideos).toHaveBeenCalledTimes(2);
      });
    });
  });
});
