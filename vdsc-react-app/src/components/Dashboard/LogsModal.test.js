import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogsModal from './LogsModal';

describe('LogsModal Component', () => {
  const mockOnClose = jest.fn();

  const mockVideoWithLogs = {
    id: 1,
    fileName: 'video1.mp4',
    logs: [
      { timestamp: '2026-01-15T10:30:00Z', info: 'Upload iniciado' },
      { timestamp: '2026-01-15T10:31:00Z', info: 'Processamento concluído' },
      { timestamp: '2026-01-15T10:29:00Z', info: 'Arquivo recebido' }, // Fora de ordem para testar ordenação
    ]
  };

  const mockVideoWithoutLogs = {
    id: 2,
    fileName: 'video2.mp4',
    logs: []
  };

  const mockVideoWithNullLogs = {
    id: 3,
    fileName: 'video3.mp4',
    logs: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderização', () => {
    it('deve renderizar o título com nome do vídeo', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);
      expect(screen.getByText(/logs do vídeo: video1.mp4/i)).toBeInTheDocument();
    });

    it('deve renderizar os logs', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);
      expect(screen.getByText('Upload iniciado')).toBeInTheDocument();
      expect(screen.getByText('Processamento concluído')).toBeInTheDocument();
      expect(screen.getByText('Arquivo recebido')).toBeInTheDocument();
    });

    it('deve renderizar mensagem quando não há logs', () => {
      render(<LogsModal video={mockVideoWithoutLogs} onClose={mockOnClose} />);
      expect(screen.getByText(/nenhum log disponível/i)).toBeInTheDocument();
    });

    it('deve renderizar mensagem quando logs é null', () => {
      render(<LogsModal video={mockVideoWithNullLogs} onClose={mockOnClose} />);
      expect(screen.getByText(/nenhum log disponível/i)).toBeInTheDocument();
    });

    it('deve renderizar botão de fechar no header', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('deve renderizar botão Fechar no footer', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
    });
  });

  describe('Ordenação de Logs', () => {
    it('deve ordenar logs por timestamp em ordem crescente', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);

      const logMessages = screen.getAllByText(/upload iniciado|processamento concluído|arquivo recebido/i);

      // Ordem esperada: Arquivo recebido (10:29), Upload iniciado (10:30), Processamento concluído (10:31)
      expect(logMessages[0]).toHaveTextContent('Arquivo recebido');
      expect(logMessages[1]).toHaveTextContent('Upload iniciado');
      expect(logMessages[2]).toHaveTextContent('Processamento concluído');
    });
  });

  describe('Formatação de Data', () => {
    it('deve formatar timestamps corretamente', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);
      // O formato esperado é DD/MM/YYYY HH:MM:SS
      expect(screen.getByText(/15\/01\/2026 10:30:00/)).toBeInTheDocument();
    });

    it('deve exibir traço quando timestamp é null', () => {
      const videoWithNullTimestamp = {
        id: 4,
        fileName: 'video4.mp4',
        logs: [{ timestamp: null, info: 'Log sem timestamp' }]
      };
      render(<LogsModal video={videoWithNullTimestamp} onClose={mockOnClose} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Interações', () => {
    it('deve chamar onClose ao clicar no botão X', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('✕'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('deve chamar onClose ao clicar no botão Fechar', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);

      fireEvent.click(screen.getByRole('button', { name: /fechar/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('deve chamar onClose ao clicar no overlay', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);

      const overlay = screen.getByText(/logs do vídeo/i).closest('.modal-overlay');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('não deve chamar onClose ao clicar no conteúdo do modal', () => {
      render(<LogsModal video={mockVideoWithLogs} onClose={mockOnClose} />);

      const content = screen.getByText(/logs do vídeo/i).closest('.modal-content');
      fireEvent.click(content);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
