import React, { useState, useMemo } from 'react';
import VideoFilters from './VideoFilters';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Box,
  Typography,
  CircularProgress,
  TableSortLabel,
  Button
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DescriptionIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
import './Dashboard.css';

const VideoTable = ({ videos, loading, onDownload, onViewLogs }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'uploadDate', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    id: '',
    search: '',
    fileExtension: '',
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

  // Helper function to normalize video data from different formats
  const normalizeVideo = (video) => {
    return {
      id: video.id || video.videoId,
      fileName: video.fileName,
      fileExtension: video.fileExtension,
      uploadDate: video.uploadDate || video.created,
      fileSize: video.fileSize || null,
      duration: video.duration || video.totalTime,
      status: video.status,
      timeUnit: video.timeUnit || video.unitTime,
      startTime: video.startTime,
      endTime: video.endTime,
      interval: Array.isArray(video.intervalTime) ? video.intervalTime.join(', ') : video.intervalTime,
      quality: video.resize,
      maxRetries: video.maxRetries,
      retries: video.retries || 0,
      logs: video.logs || []
    };
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'UPLOADED': { label: 'Carregado', color: 'default' },
      'PROCESSING': { label: 'Processando', color: 'warning' },
      'FINISHED': { label: 'Concluído', color: 'success' },
      'FAILED': { label: 'Falhou', color: 'error' },
      'RETRYING': { label: 'Tentando Novamente', color: 'info' }
    };
    const statusInfo = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
  };

  // Normalize video data to handle different formats
  const normalizedVideos = videos.map(normalizeVideo);

  // Função para filtrar vídeos
  const filteredVideos = useMemo(() => {
    if (!normalizedVideos || normalizedVideos.length === 0) return [];

    return normalizedVideos.filter(video => {
      // Filtro de busca por ID
      if (filters.id && video.id?.toString() !== filters.id.toString()) {
        return false;
      }

      // Filtro de busca por nome do arquivo
      if (filters.search && !video.fileName?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Filtro de extensão
      if (filters.fileExtension && video.fileExtension?.toLowerCase() !== filters.fileExtension.toLowerCase()) {
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
  }, [normalizedVideos, filters]);

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
      fileExtension: '',
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Carregando vídeos...</Typography>
      </Box>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Nenhum vídeo encontrado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Clique em "Upload Novo Vídeo" para começar
        </Typography>
      </Box>
    );
  }


  const hasActiveFilters = filters.id || filters.search || filters.fileExtension || filters.status || filters.dateFrom || filters.dateTo;
  const resultCount = sortedVideos.length;
  const totalCount = videos.length;

  return (
    <Box>
      <VideoFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      
      {hasActiveFilters && (
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
          Mostrando <strong>{resultCount}</strong> de <strong>{totalCount}</strong> vídeo{totalCount !== 1 ? 's' : ''}
        </Typography>
      )}

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: 'linear-gradient(135deg, rgba(90, 61, 154, 0.9) 0%, rgba(76, 81, 191, 0.9) 100%)' }}>
              <TableCell colSpan={5} sx={{ fontWeight: 'bold', textAlign: 'center', borderBottom: 2, borderColor: '#c5cae9', py: 1, fontSize: '0.875rem', color: 'white' }}>
                Identificação
              </TableCell>
              <TableCell colSpan={2} sx={{ fontWeight: 'bold', textAlign: 'center', borderBottom: 2, borderColor: '#c5cae9', py: 1, fontSize: '0.875rem', color: 'white' }}>
                Ações
              </TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: '#f3e5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 1, fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('id')}>
                <TableSortLabel
                  active={sortConfig.key === 'id'}
                  direction={sortConfig.key === 'id' ? sortConfig.direction : 'asc'}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 1, fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('fileName')}>
                <TableSortLabel
                  active={sortConfig.key === 'fileName'}
                  direction={sortConfig.key === 'fileName' ? sortConfig.direction : 'asc'}
                >
                  Arquivo
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 1, fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('uploadDate')}>
                <TableSortLabel
                  active={sortConfig.key === 'uploadDate'}
                  direction={sortConfig.key === 'uploadDate' ? sortConfig.direction : 'asc'}
                >
                  Data de Upload
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 1, fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('duration')}>
                <TableSortLabel
                  active={sortConfig.key === 'duration'}
                  direction={sortConfig.key === 'duration' ? sortConfig.direction : 'asc'}
                >
                  Duração
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 1, fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('status')}>
                <TableSortLabel
                  active={sortConfig.key === 'status'}
                  direction={sortConfig.key === 'status' ? sortConfig.direction : 'asc'}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 1, fontSize: '0.875rem', color: 'text.secondary' }}>Download</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 1, fontSize: '0.875rem', color: 'text.secondary' }}>Logs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1rem' }}>
                    Nenhum vídeo encontrado com os filtros aplicados
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    Tente ajustar os filtros ou limpar a pesquisa
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedVideos.map((video) => (
                <React.Fragment key={video.id}>
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => toggleRow(video.id)}
                  >
                    <TableCell sx={{ py: 1, textAlign: 'center', color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        <IconButton size="small" sx={{ p: 0.5 }}>
                          {expandedRows.has(video.id) ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                        </IconButton>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{video.id}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center', color: 'text.secondary' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>
                          {video.fileName}.{video.fileExtension}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1, fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }}>{formatDate(video.uploadDate)}</TableCell>
                    <TableCell sx={{ py: 1, fontSize: '0.875rem', textAlign: 'center', color: 'text.secondary' }}>{formatDuration(video.duration)}</TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>{getStatusBadge(video.status)}</TableCell>
                    <TableCell sx={{ textAlign: 'center', py: 1 }}>
                      <IconButton
                        sx={{
                          background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5a3d9a 0%, #4c51bf 100%)',
                          },
                          '&:disabled': {
                            background: 'grey.300',
                            color: 'grey.500'
                          }
                        }}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(video);
                        }}
                        disabled={video.status !== 'FINISHED'}
                        title={video.status === 'FINISHED' ? 'Download' : 'Disponível apenas quando o processamento for concluído'}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', py: 1 }}>
                      <IconButton
                        sx={{
                          background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5a3d9a 0%, #4c51bf 100%)',
                          },
                          '&:disabled': {
                            background: 'grey.300',
                            color: 'grey.500'
                          }
                        }}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewLogs(video);
                        }}
                        title="Ver Logs"
                      >
                        <DescriptionIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell sx={{ py: 0 }} colSpan={7}>
                      <Collapse in={expandedRows.has(video.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.125rem', mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
                            Informações de Processamento
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Unidade de Tempo:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{formatTimeUnit(video.timeUnit)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Tempo Inicial:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{video.startTime ?? '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Tempo Final:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{video.endTime ?? '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Intervalo:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{video.interval || '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Qualidade:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{video.quality || '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Máx. Retentativas:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{video.maxRetries ?? '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Retentativas:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{video.retries ?? 0}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default VideoTable;
