import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoFilters from './VideoFilters';

describe('VideoFilters Component', () => {
  const mockOnFilterChange = jest.fn();
  const mockOnClearFilters = jest.fn();
  const defaultFilters = {
    id: '',
    search: '',
    extension: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderVideoFilters = (filters = defaultFilters) => {
    return render(
      <VideoFilters
        filters={filters}
        onFilterChange={mockOnFilterChange}
        onClearFilters={mockOnClearFilters}
      />
    );
  };

  describe('Renderização', () => {
    it('deve renderizar título de filtros', () => {
      renderVideoFilters();
      expect(screen.getByText(/filtros de pesquisa/i)).toBeInTheDocument();
    });

    it('deve renderizar campo de busca por ID', () => {
      renderVideoFilters();
      expect(screen.getByLabelText(/id/i)).toBeInTheDocument();
    });

    it('deve renderizar campo de busca por nome', () => {
      renderVideoFilters();
      expect(screen.getByLabelText(/nome do arquivo/i)).toBeInTheDocument();
    });

    it('deve renderizar select de extensão', () => {
      renderVideoFilters();
      expect(screen.getByLabelText(/extensão/i)).toBeInTheDocument();
    });

    it('deve renderizar select de status', () => {
      renderVideoFilters();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });
  });

  describe('Interações', () => {
    it('deve chamar onFilterChange ao digitar no campo ID', () => {
      renderVideoFilters();

      const idInput = screen.getByLabelText(/id/i);
      fireEvent.change(idInput, { target: { value: '123' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        id: '123'
      });
    });

    it('deve chamar onFilterChange ao digitar no campo de busca', () => {
      renderVideoFilters();

      const searchInput = screen.getByLabelText(/nome do arquivo/i);
      fireEvent.change(searchInput, { target: { value: 'video' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'video'
      });
    });

    it('deve chamar onFilterChange ao selecionar extensão', () => {
      renderVideoFilters();

      const extensionSelect = screen.getByLabelText(/extensão/i);
      fireEvent.change(extensionSelect, { target: { value: 'mp4' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        extension: 'mp4'
      });
    });

    it('deve chamar onFilterChange ao selecionar status', () => {
      renderVideoFilters();

      const statusSelect = screen.getByLabelText(/status/i);
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultFilters,
        status: 'completed'
      });
    });
  });

  describe('Botão Limpar Filtros', () => {
    it('não deve mostrar botão quando não há filtros ativos', () => {
      renderVideoFilters();
      expect(screen.queryByText(/limpar filtros/i)).not.toBeInTheDocument();
    });

    it('deve mostrar botão quando há filtro de busca ativo', () => {
      renderVideoFilters({ ...defaultFilters, search: 'test' });
      expect(screen.getByText(/limpar filtros/i)).toBeInTheDocument();
    });

    it('deve mostrar botão quando há filtro de status ativo', () => {
      renderVideoFilters({ ...defaultFilters, status: 'completed' });
      expect(screen.getByText(/limpar filtros/i)).toBeInTheDocument();
    });

    it('deve mostrar botão quando há filtro de ID ativo', () => {
      renderVideoFilters({ ...defaultFilters, id: '123' });
      expect(screen.getByText(/limpar filtros/i)).toBeInTheDocument();
    });

    it('deve mostrar botão quando há filtro de extensão ativo', () => {
      renderVideoFilters({ ...defaultFilters, extension: 'mp4' });
      expect(screen.getByText(/limpar filtros/i)).toBeInTheDocument();
    });

    it('deve mostrar botão quando há filtro de data inicial ativo', () => {
      renderVideoFilters({ ...defaultFilters, dateFrom: '2026-01-01' });
      expect(screen.getByText(/limpar filtros/i)).toBeInTheDocument();
    });

    it('deve mostrar botão quando há filtro de data final ativo', () => {
      renderVideoFilters({ ...defaultFilters, dateTo: '2026-01-31' });
      expect(screen.getByText(/limpar filtros/i)).toBeInTheDocument();
    });

    it('deve chamar onClearFilters ao clicar no botão', () => {
      renderVideoFilters({ ...defaultFilters, search: 'test' });

      fireEvent.click(screen.getByText(/limpar filtros/i));

      expect(mockOnClearFilters).toHaveBeenCalled();
    });
  });

  describe('Opções de Select', () => {
    it('deve renderizar opções de extensão', () => {
      renderVideoFilters();

      const extensionSelect = screen.getByLabelText(/extensão/i);
      expect(extensionSelect).toContainElement(screen.getByText(/todas as extensões/i));
      expect(extensionSelect).toContainElement(screen.getByText(/mp4/i));
      expect(extensionSelect).toContainElement(screen.getByText(/avi/i));
      expect(extensionSelect).toContainElement(screen.getByText(/mov/i));
    });

    it('deve renderizar opções de status', () => {
      renderVideoFilters();

      const statusSelect = screen.getByLabelText(/status/i);
      expect(statusSelect).toContainElement(screen.getByText(/todos os status/i));
      expect(statusSelect).toContainElement(screen.getByText(/pendente/i));
      expect(statusSelect).toContainElement(screen.getByText(/processando/i));
      expect(statusSelect).toContainElement(screen.getByText(/concluído/i));
      expect(statusSelect).toContainElement(screen.getByText(/falhou/i));
    });
  });
});
