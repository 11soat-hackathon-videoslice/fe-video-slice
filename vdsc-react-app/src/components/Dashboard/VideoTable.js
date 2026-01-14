import React, { useState, useMemo } from 'react';
import './Dashboard.css';

const VideoTable = ({ videos, loading, onDownload, onViewLogs }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'uploadDate', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState(new Set());

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
      'pending': { label: 'Pendente', className: 'status-pending' },
      'processing': { label: 'Processando', className: 'status-processing' },
      'completed': { label: 'Concluído', className: 'status-completed' },
      'failed': { label: 'Falhou', className: 'status-failed' }
    };
    const statusInfo = statusMap[status] || { label: status, className: 'status-unknown' };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  const sortedVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];

    let sortableVideos = [...videos];
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
  }, [videos, sortConfig]);

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
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
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
        <div className="table-wrapper">
          <table className="video-table">
            <thead>
              <tr>
                <th colSpan="5" className="section-header">Identificação</th>
                <th colSpan="2" className="section-header">Ações</th>
              </tr>
              <tr>
                <th>ID</th>
                <th>Nome do Arquivo</th>
                <th>Data de Upload</th>
                <th>Duração</th>
                <th>Status</th>
                <th>Download</th>
                <th>Logs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
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

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="video-table">
          <thead>
            <tr>
              <th colSpan="5" className="section-header">Identificação</th>
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
            {sortedVideos.map((video) => (
              <React.Fragment key={video.id}>
                <tr 
                  className={`video-row ${expandedRows.has(video.id) ? 'expanded' : ''}`}
                  onClick={() => toggleRow(video.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Identificação */}
                  <td>
                    <span className="expand-icon">
                      {expandedRows.has(video.id) ? '▼' : '▶'}
                    </span>
                    {video.id}
                  </td>
                  <td className="file-name">{video.fileName}</td>
                  <td>{formatDate(video.uploadDate)}</td>
                  <td>{formatDuration(video.duration)}</td>
                  <td>{getStatusBadge(video.status)}</td>
                  
                  {/* Ações */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn-action btn-download"
                      onClick={() => onDownload(video)}
                      title="Download"
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
                    <td colSpan="7">
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoTable;
