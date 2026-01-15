import React from 'react';
import './Dashboard.css';

const VideoFilters = ({ filters, onFilterChange, onClearFilters }) => {
  const handleInputChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const hasActiveFilters = () => {
    return filters.search || 
           filters.status || 
           filters.dateFrom || 
           filters.dateTo ||
           filters.id ||
           filters.extension;
  };

  return (
    <div className="filters-container">
      <div className="filters-title">
        <h3>🔍 Filtros de Pesquisa</h3>
        {hasActiveFilters() && (
          <button 
            className="btn-clear-filters"
            onClick={onClearFilters}
            title="Limpar todos os filtros"
          >
            ✕ Limpar Filtros
          </button>
        )}
      </div>
      
      <div className="filters-grid">
        {/* Busca por ID */}
        <div className="filter-item">
          <label htmlFor="filter-id">ID</label>
          <input
            id="filter-id"
            type="number"
            placeholder="Buscar por ID..."
            value={filters.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            className="filter-input"
          />
        </div>

        {/* Busca por nome do arquivo */}
        <div className="filter-item">
          <label htmlFor="filter-search">Nome do Arquivo</label>
          <input
            id="filter-search"
            type="text"
            placeholder="Buscar por nome..."
            value={filters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="filter-input"
          />
        </div>

        {/* Filtro de Extensão */}
        <div className="filter-item">
          <label htmlFor="filter-extension">Extensão</label>
          <select
            id="filter-extension"
            value={filters.extension}
            onChange={(e) => handleInputChange('extension', e.target.value)}
            className="filter-select"
          >
            <option value="">Todas as extensões</option>
            <option value="mp4">MP4</option>
            <option value="avi">AVI</option>
            <option value="mov">MOV</option>
            <option value="mkv">MKV</option>
            <option value="webm">WEBM</option>
          </select>
        </div>

        {/* Filtro de Status */}
        <div className="filter-item">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="processing">Processando</option>
            <option value="completed">Concluído</option>
            <option value="failed">Falhou</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default VideoFilters;
