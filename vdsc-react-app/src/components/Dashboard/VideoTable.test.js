import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoTable from './VideoTable';

// Mock do VideoFilters
jest.mock('./VideoFilters', () => {
  return function MockVideoFilters({ filters, onFilterChange, onClearFilters }) {
    return (
      <div data-testid="video-filters">
        <input
          data-testid="filter-search"
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        />
        <select
          data-testid="filter-status"
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        >
          <option value="">All</option>
          <option value="FINISHED">Finished</option>
          <option value="PROCESSING">Processing</option>
        </select>
        <button onClick={onClearFilters} data-testid="clear-filters">Clear</button>
      </div>
    );
  };
});

describe('VideoTable Component', () => {
  const mockOnDownload = jest.fn();
  const mockOnViewLogs = jest.fn();

  const mockVideos = [
    {
      id: 1,
      fileName: 'video1.mp4',
      extensionFile: 'mp4',
      uploadDate: '2026-01-15T10:30:00Z',
      fileSize: 10485760, // 10 MB
      duration: 125, // 2:05
      status: 'FINISHED',
      timeUnit: 's',
      startTime: 0,
      endTime: 120,
      interval: '10',
      quality: 'high',
      maxRetries: 3,
      retries: 0,
      logs: []
    },
    {
      id: 2,
      fileName: 'video2.avi',
      extensionFile: 'avi',
      uploadDate: '2026-01-14T08:00:00Z',
      fileSize: 5242880, // 5 MB
      duration: 60,
      status: 'PROCESSING',
      timeUnit: 'ms',
      startTime: 0,
      endTime: 60000,
      interval: '5000',
      quality: 'medium',
      maxRetries: 3,
      retries: 1,
      logs: []
    },
    {
      id: 3,
      fileName: 'video3.mov',
      extensionFile: 'mov',
      uploadDate: '2026-01-13T15:45:00Z',
      duration: 300,
      status: 'FAILED',
      logs: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderVideoTable = (props = {}) => {
    const defaultProps = {
      videos: mockVideos,
      loading: false,
      onDownload: mockOnDownload,
      onViewLogs: mockOnViewLogs,
    };
    return render(<VideoTable {...defaultProps} {...props} />);
  };

  describe('Renderização', () => {
    it('deve renderizar a tabela com vídeos', () => {
      renderVideoTable();
      expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      expect(screen.getByText('video2.avi')).toBeInTheDocument();
      expect(screen.getByText('video3.mov')).toBeInTheDocument();
    });

    it('deve exibir estado de loading', () => {
      renderVideoTable({ loading: true });
      expect(screen.getByText(/carregando vídeos/i)).toBeInTheDocument();
    });

    it('deve exibir mensagem quando não há vídeos', () => {
      renderVideoTable({ videos: [] });
      expect(screen.getByText(/nenhum vídeo encontrado/i)).toBeInTheDocument();
    });

    it('deve renderizar filtros', () => {
      renderVideoTable();
      expect(screen.getByTestId('video-filters')).toBeInTheDocument();
    });
  });

  describe('Formatação', () => {
    it('deve formatar data corretamente', () => {
      renderVideoTable();
      // O formato esperado é DD/MM/YYYY HH:MM:SS
      expect(screen.getByText(/15\/01\/2026/)).toBeInTheDocument();
    });

    it('deve formatar duração corretamente', () => {
      renderVideoTable();
      // 125 segundos = 2:05
      expect(screen.getByText('2:05')).toBeInTheDocument();
      // 60 segundos = 1:00
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('deve exibir badges de status', () => {
      renderVideoTable();
      expect(screen.getByText('Concluído')).toBeInTheDocument();
      expect(screen.getByText('Processando')).toBeInTheDocument();
      expect(screen.getByText('Falhou')).toBeInTheDocument();
    });
  });

  describe('Ordenação', () => {
    it('deve ordenar por coluna ao clicar no header', () => {
      renderVideoTable();

      // Clicar no header de Nome do Arquivo
      const fileNameHeader = screen.getByText(/nome do arquivo/i);
      fireEvent.click(fileNameHeader);

      const rows = screen.getAllByText(/video\d\.(mp4|avi|mov)/);
      // Após ordenação ascendente, video1 deve vir primeiro
      expect(rows[0]).toHaveTextContent('video1.mp4');
    });

    it('deve inverter ordenação ao clicar novamente', () => {
      renderVideoTable();

      const fileNameHeader = screen.getByText(/nome do arquivo/i);
      fireEvent.click(fileNameHeader); // asc
      fireEvent.click(fileNameHeader); // desc

      const rows = screen.getAllByText(/video\d\.(mp4|avi|mov)/);
      // Após ordenação descendente, video3 deve vir primeiro
      expect(rows[0]).toHaveTextContent('video3.mov');
    });
  });

  describe('Filtragem', () => {
    it('deve filtrar por texto de busca', () => {
      renderVideoTable();

      const searchInput = screen.getByTestId('filter-search');
      fireEvent.change(searchInput, { target: { value: 'video1' } });

      expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      expect(screen.queryByText('video2.avi')).not.toBeInTheDocument();
    });

    it('deve filtrar por status', () => {
      renderVideoTable();

      const statusSelect = screen.getByTestId('filter-status');
      fireEvent.change(statusSelect, { target: { value: 'FINISHED' } });

      expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      expect(screen.queryByText('video2.avi')).not.toBeInTheDocument();
    });

    it('deve limpar filtros', () => {
      renderVideoTable();

      const searchInput = screen.getByTestId('filter-search');
      fireEvent.change(searchInput, { target: { value: 'video1' } });

      expect(screen.queryByText('video2.avi')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('clear-filters'));

      expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      expect(screen.getByText('video2.avi')).toBeInTheDocument();
    });

    it('deve exibir mensagem quando filtros não encontram resultados', () => {
      renderVideoTable();

      const searchInput = screen.getByTestId('filter-search');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText(/nenhum vídeo encontrado com os filtros/i)).toBeInTheDocument();
    });
  });

  describe('Expansão de linhas', () => {
    it('deve expandir linha ao clicar', () => {
      renderVideoTable();

      const row = screen.getByText('video1.mp4').closest('tr');
      fireEvent.click(row);

      expect(screen.getByText(/informações de processamento/i)).toBeInTheDocument();
      expect(screen.getByText(/unidade de tempo/i)).toBeInTheDocument();
    });

    it('deve colapsar linha ao clicar novamente', () => {
      renderVideoTable();

      const row = screen.getByText('video1.mp4').closest('tr');
      fireEvent.click(row); // expand
      expect(screen.getByText(/informações de processamento/i)).toBeInTheDocument();

      fireEvent.click(row); // collapse
      expect(screen.queryByText(/informações de processamento/i)).not.toBeInTheDocument();
    });
  });

  describe('Ações', () => {
    it('deve chamar onDownload ao clicar no botão de download', () => {
      renderVideoTable();

      const downloadButtons = screen.getAllByTitle(/download/i);
      fireEvent.click(downloadButtons[0]);

      expect(mockOnDownload).toHaveBeenCalledWith(mockVideos[0]);
    });

    it('deve desabilitar download quando status não é FINISHED', () => {
      renderVideoTable();

      // Video2 está em PROCESSING
      const downloadButtons = screen.getAllByRole('button', { name: /⬇️/i });
      expect(downloadButtons[1]).toBeDisabled();
    });

    it('deve chamar onViewLogs ao clicar no botão de logs', () => {
      renderVideoTable();

      const logsButtons = screen.getAllByTitle(/ver logs/i);
      fireEvent.click(logsButtons[0]);

      expect(mockOnViewLogs).toHaveBeenCalledWith(mockVideos[0]);
    });
  });

  describe('Contagem de resultados', () => {
    it('deve mostrar contagem quando há filtros ativos', () => {
      renderVideoTable();

      const searchInput = screen.getByTestId('filter-search');
      fireEvent.change(searchInput, { target: { value: 'video1' } });

      // Verifica se a mensagem de contagem está presente
      const countMessage = screen.getByText((content, element) => {
        // Verifica se é um span e contém o texto esperado
        return element?.tagName === 'SPAN' &&
               /mostrando\s+1\s+de\s+3\s+vídeos?/i.test(element.textContent);
      });
      expect(countMessage).toBeInTheDocument();
    });
  });
});
