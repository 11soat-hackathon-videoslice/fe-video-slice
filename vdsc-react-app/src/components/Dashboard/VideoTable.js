import React, { useState, useMemo } from 'react';
import VideoFilters from './VideoFilters';
import './Dashboard.css';

const VideoTable = ({ videos, loading, onDownload, onViewLogs }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'uploadDate', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    id: '',
    search: '',
    extensionFile: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeUnit = (unit) => {
    if (!unit) return '-';
    const unitMap = {
      's': 'segundo',
      'ms': 'milissegundos'
    };
    return unitMap[unit] || unit;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'UPLOADED': { label: 'Carregado', className: 'status-uploaded' },
      'PROCESSING': { label: 'Processando', className: 'status-processing' },
      'FINISHED': { label: 'Concluído', className: 'status-completed' },
      'FAILED': { label: 'Falhou', className: 'status-failed' }
    };
    const statusInfo = statusMap[status] || { label: status, className: 'status-unknown' };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  // Função para filtrar vídeos
  const filteredVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];

    return videos.filter(video => {
      // Filtro de busca por ID
      if (filters.id && video.id?.toString() !== filters.id.toString()) {
        return false;
      }

      // Filtro de busca por nome do arquivo
      if (filters.search && !video.fileName?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Filtro de extensão
      if (filters.extensionFile && video.extensionFile?.toLowerCase() !== filters.extensionFile.toLowerCase()) {
        return false;
      }

      // Filtro de status
      if (filters.status && video.status !== filters.status) {
        return false;
      }

      // Filtro de data inicial
      if (filters.dateFrom) {
        const videoDate = new Date(video.uploadDate);
        const filterDateFrom = new Date(filters.dateFrom);
        filterDateFrom.setHours(0, 0, 0, 0);
        if (videoDate < filterDateFrom) {
          return false;
        }
      }

      // Filtro de data final
      if (filters.dateTo) {
        const videoDate = new Date(video.uploadDate);
        const filterDateTo = new Date(filters.dateTo);
        filterDateTo.setHours(23, 59, 59, 999);
        if (videoDate > filterDateTo) {
          return false;
        }
      }

      return true;
    });
  }, [videos, filters]);

  const sortedVideos = useMemo(() => {
    if (!filteredVideos || filteredVideos.length === 0) return [];

    let sortableVideos = [...filteredVideos];
    sortableVideos.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle string values
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortableVideos;
  }, [filteredVideos, sortConfig]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      id: '',
      search: '',
      extensionFile: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className="sort-indicator">⇅</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="sort-indicator active">↑</span> : 
      <span className="sort-indicator active">↓</span>;
  };

  const toggleRow = (videoId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(videoId)) {
      newExpandedRows.delete(videoId);
    } else {
      newExpandedRows.add(videoId);
    }
    setExpandedRows(newExpandedRows);
  };

  if (loading) {
    return (
      <div className="table-container">
        <VideoFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
        <div className="table-wrapper">
          <table className="video-table">
            <thead>
              <tr>
                <th colSpan="7" className="section-header">Identificação</th>
                <th colSpan="2" className="section-header">Ações</th>
              </tr>
              <tr>
                <th>ID</th>
                <th>Nome do Arquivo</th>
                <th>Extensão</th>
                <th>Data de Upload</th>
                <th>Tamanho</th>
                <th>Duração</th>
                <th>Status</th>
                <th>Download</th>
                <th>Logs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Carregando vídeos...</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="table-container">
        <VideoFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
        <div className="table-wrapper">
          <table className="video-table">
            <thead>
              <tr>
                <th colSpan="6" className="section-header">Identificação</th>
                <th colSpan="2" className="section-header">Ações</th>
              </tr>
              <tr>
                <th>ID</th>
                <th>Nome do Arquivo</th>
                <th>Extensão</th>
                <th>Data de Upload</th>
                <th>Duração</th>
                <th>Status</th>
                <th>Download</th>
                <th>Logs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="empty-state">
                    <p>Nenhum vídeo encontrado</p>
                    <small>Clique em "Upload Novo Vídeo" para começar</small>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const hasActiveFilters = filters.id || filters.search || filters.extensionFile || filters.status || filters.dateFrom || filters.dateTo;
  const resultCount = sortedVideos.length;
  const totalCount = videos.length;

  return (
    <div className="table-container">
      <VideoFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      
      {hasActiveFilters && (
        <div className="filter-results-info">
          <span>
            Mostrando <strong>{resultCount}</strong> de <strong>{totalCount}</strong> vídeo{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="table-wrapper">
        <table className="video-table">
          <thead>
            <tr>
              <th colSpan="6" className="section-header">Identificação</th>
              <th colSpan="2" className="section-header">Ações</th>
            </tr>
            <tr>
              {/* Identificação */}
              <th onClick={() => requestSort('id')}>
                ID {getSortIndicator('id')}
              </th>
              <th onClick={() => requestSort('fileName')}>
                Nome do Arquivo {getSortIndicator('fileName')}
              </th>
              <th onClick={() => requestSort('extension')}>
                Extensão {getSortIndicator('extensionFile')}
              </th>
              <th onClick={() => requestSort('uploadDate')}>
                Data de Upload {getSortIndicator('uploadDate')}
              </th>
              <th onClick={() => requestSort('duration')}>
                Duração {getSortIndicator('duration')}
              </th>
              <th onClick={() => requestSort('status')}>
                Status {getSortIndicator('status')}
              </th>
              
              {/* Ações */}
              <th>Download</th>
              <th>Logs</th>
            </tr>
          </thead>
          <tbody>
            {sortedVideos.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="empty-state">
                    <p>Nenhum vídeo encontrado com os filtros aplicados</p>
                    <small>Tente ajustar os filtros ou limpar a pesquisa</small>
                  </div>
                </td>
              </tr>
            ) : (
              sortedVideos.map((video) => (
              <React.Fragment key={video.id}>
                <tr 
                  className={`video-row ${expandedRows.has(video.id) ? 'expanded' : ''}`}
                  onClick={() => toggleRow(video.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Identificação */}
                  <td className="id-cell">
                    <span className="expand-icon">
                      {expandedRows.has(video.id) ? '−' : '+'}
                    </span>
                    {video.id}
                  </td>
                  <td className="file-name">{video.fileName}</td>
                  <td>{video.extensionFile || '-'}</td>
                  <td>{formatDate(video.uploadDate)}</td>
                  <td>{formatDuration(video.duration)}</td>
                  <td>{getStatusBadge(video.status)}</td>
                  
                  {/* Ações */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn-action btn-download"
                      onClick={() => onDownload(video)}
                      disabled={video.status !== 'FINISHED'}
                      title={video.status === 'FINISHED' ? 'Download' : 'Disponível apenas quando o processamento for concluído'}
                    >
                      ⬇️
                    </button>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn-action btn-logs"
                      onClick={() => onViewLogs(video)}
                      title="Ver Logs"
                    >
                      📋
                    </button>
                  </td>
                </tr>
                
                {/* Linha de detalhes expandida */}
                {expandedRows.has(video.id) && (
                  <tr className="details-row">
                    <td colSpan="8">
                      <div className="details-content">
                        <div className="details-section">
                          <h4>Informações de Processamento</h4>
                          <div className="details-grid">
                            <div className="detail-item">
                              <span className="detail-label">Unidade de Tempo:</span>
                              <span className="detail-value">{formatTimeUnit(video.timeUnit)}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Tempo Inicial:</span>
                              <span className="detail-value">{video.startTime ?? '-'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Tempo Final:</span>
                              <span className="detail-value">{video.endTime ?? '-'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Intervalo:</span>
                              <span className="detail-value">{video.interval || '-'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Qualidade:</span>
                              <span className="detail-value">{video.quality || '-'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Máx. Retentativas:</span>
                              <span className="detail-value">{video.maxRetries ?? '-'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Retentativas:</span>
                              <span className="detail-value">{video.retries ?? 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoTable;
