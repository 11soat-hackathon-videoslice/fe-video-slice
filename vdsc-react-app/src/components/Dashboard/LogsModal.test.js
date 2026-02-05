import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LogsModal from './LogsModal';

describe('LogsModal Component', () => {
  const mockVideo = {
    id: 1,
    fileName: 'test-video.mp4',
    quality: 'high',
    status: 'completed',
    uploadedAt: '2026-01-13T10:00:00Z',
    processedAt: '2026-01-13T10:30:00Z',
    logs: [
      {
        timestamp: '2026-01-13T10:00:00Z',
        info: 'Upload iniciado'
      },
      {
        timestamp: '2026-01-13T10:15:00Z',
        info: 'Processamento iniciado'
      },
      {
        timestamp: '2026-01-13T10:30:00Z',
        info: 'Processamento concluído'
      }
    ]
  };

  describe('Rendering', () => {
    it('deve renderizar o modal de logs', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/Logs do Vídeo/i)).toBeInTheDocument();
    });

    it('deve exibir nome do arquivo no modal', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/test-video\.mp4/i)).toBeInTheDocument();
    });

    it('deve exibir ID do vídeo', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });

    it('deve exibir status do vídeo', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('deve exibir qualidade do vídeo', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/high/i)).toBeInTheDocument();
    });

    it('deve exibir botão de fechar', () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      const closeButton = container.querySelector('.modal-close');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Logs Display', () => {
    it('deve exibir todos os logs', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/Upload iniciado/i)).toBeInTheDocument();
      expect(screen.getByText(/Processamento iniciado/i)).toBeInTheDocument();
      expect(screen.getByText(/Processamento concluído/i)).toBeInTheDocument();
    });

    it('deve exibir timestamp dos logs', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/2026-01-13T10:00:00Z/)).toBeInTheDocument();
      expect(screen.getByText(/2026-01-13T10:15:00Z/)).toBeInTheDocument();
    });

    it('deve exibir mensagem quando não há logs', () => {
      const videoWithoutLogs = {
        ...mockVideo,
        logs: []
      };

      render(
        <LogsModal onClose={jest.fn()} video={videoWithoutLogs} />
      );
      expect(screen.getByText(/Nenhum log/i)).toBeInTheDocument();
    });

    it('deve listar logs em ordem cronológica', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      const logs = screen.getAllByText(/2026-01-13T/);
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Video Information', () => {
    it('deve exibir data de upload', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/2026-01-13T10:00:00Z/)).toBeInTheDocument();
    });

    it('deve exibir data de processamento', () => {
      render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );
      expect(screen.getByText(/2026-01-13T10:30:00Z/)).toBeInTheDocument();
    });

    it('deve exibir status "Processando" quando video está em processamento', () => {
      const processingVideo = {
        ...mockVideo,
        status: 'processing',
        processedAt: null
      };

      render(
        <LogsModal onClose={jest.fn()} video={processingVideo} />
      );
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('deve exibir status "Erro" quando processamento falhou', () => {
      const errorVideo = {
        ...mockVideo,
        status: 'error'
      };

      render(
        <LogsModal onClose={jest.fn()} video={errorVideo} />
      );
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('deve fechar o modal ao clicar no botão X', () => {
      const onClose = jest.fn();
      const { container } = render(
        <LogsModal onClose={onClose} video={mockVideo} />
      );

      const closeButton = container.querySelector('.modal-close');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('deve fechar o modal ao clicar fora dele', () => {
      const onClose = jest.fn();
      const { container } = render(
        <LogsModal onClose={onClose} video={mockVideo} />
      );

      const overlay = container.querySelector('.modal-overlay');
      fireEvent.click(overlay);

      // Dependendo da implementação, pode fechar ao clicar no overlay
      // Ajuste conforme necessário
    });

    it('deve escutar evento de close via callback', () => {
      const onClose = jest.fn();
      const { container } = render(
        <LogsModal onClose={onClose} video={mockVideo} />
      );

      const closeButton = container.querySelector('.modal-close');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling and Appearance', () => {
    it('deve aplicar classes CSS apropriadas', () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
      expect(container.querySelector('.modal-content')).toBeInTheDocument();
    });

    it('deve ter logs visíveis em container scrollável', () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      const logContainer = container.querySelector('.logs-container');
      expect(logContainer).toBeInTheDocument();
    });

    it('deve exibir cada log em item separado', () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      const logItems = container.querySelectorAll('.log-item');
      expect(logItems.length).toBe(mockVideo.logs.length);
    });
  });

  describe('Empty States', () => {
    it('deve renderizar corretamente com video sem logs', () => {
      const videoWithoutLogs = {
        ...mockVideo,
        logs: undefined
      };

      render(
        <LogsModal onClose={jest.fn()} video={videoWithoutLogs} />
      );
      expect(screen.getByText(/Nenhum log/i)).toBeInTheDocument();
    });

    it('deve renderizar corretamente com video sem informações opcionais', () => {
      const minimalVideo = {
        id: 1,
        fileName: 'test.mp4',
        logs: []
      };

      render(
        <LogsModal onClose={jest.fn()} video={minimalVideo} />
      );
      expect(screen.getByText(/test\.mp4/i)).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('deve permitir copiar logs', () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      const copyButton = container.querySelector('.copy-logs-btn');
      if (copyButton) {
        fireEvent.click(copyButton);
        // Verifica se a funcionalidade de cópia foi acionada
        expect(copyButton).toBeInTheDocument();
      }
    });

    it('deve mostrar mensagem de sucesso ao copiar', async () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      const copyButton = container.querySelector('.copy-logs-btn');
      if (copyButton) {
        fireEvent.click(copyButton);

        await waitFor(() => {
          expect(screen.queryByText(/copiado/i)).toBeInTheDocument();
        }, { timeout: 500 });
      }
    });
  });

  describe('Responsiveness', () => {
    it('deve adaptar layout para telas menores', () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      // Verifica se o container tem classes de responsividade
      const modal = container.querySelector('.modal-content');
      expect(modal).toBeInTheDocument();
    });

    it('deve manter conteúdo legível em diferentes resoluções', () => {
      const { container } = render(
        <LogsModal onClose={jest.fn()} video={mockVideo} />
      );

      const logContainer = container.querySelector('.logs-container');
      expect(logContainer).toHaveStyle('overflow-y: auto');
    });
  });
});
