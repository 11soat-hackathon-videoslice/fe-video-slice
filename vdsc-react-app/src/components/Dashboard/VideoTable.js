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
  CircularProgress
} from '@mui/material';
import { keyframes } from '@mui/system';
import {
  Download as DownloadIcon,
  Description as DescriptionIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';

// Keyframes para animação de pulso
const pulseAnimation = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

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

  const formatResize = (resize) => {
    if (!resize) return '-';
    const resizeMap = {
      'original': 'Original',
      'ultra': 'Ultra (1080)',
      'high': 'Alto (720)',
      'medium': 'Médio (480)',
      'low': 'Baixo (360)'
    };
    return resizeMap[resize] || resize;
  };

  const formatQuality = (quality) => {
    if (!quality) return '-';
    return quality;
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
      interval: (() => {
        // Verificar intervalTime primeiro
        if (video.intervalTime !== undefined && video.intervalTime !== null) {
          if (Array.isArray(video.intervalTime) && video.intervalTime.length > 0) {
            return video.intervalTime.join(', ');
          }
          if (typeof video.intervalTime === 'string' && video.intervalTime.trim() !== '') {
            return video.intervalTime.trim();
          }
          if (typeof video.intervalTime === 'number') {
            return String(video.intervalTime);
          }
        }

        // Verificar interval
        if (video.interval !== undefined && video.interval !== null) {
          if (Array.isArray(video.interval) && video.interval.length > 0) {
            return video.interval.join(', ');
          }
          if (typeof video.interval === 'string' && video.interval.trim() !== '') {
            return video.interval.trim();
          }
          if (typeof video.interval === 'number') {
            return String(video.interval);
          }
        }

        // Verificar timeInterval
        if (video.timeInterval !== undefined && video.timeInterval !== null) {
          if (Array.isArray(video.timeInterval) && video.timeInterval.length > 0) {
            return video.timeInterval.join(', ');
          }
          if (typeof video.timeInterval === 'string' && video.timeInterval.trim() !== '') {
            return video.timeInterval.trim();
          }
          if (typeof video.timeInterval === 'number') {
            return String(video.timeInterval);
          }
        }

        return '-';
      })(),
      resize: video.resize,
      quality: video.qualityOutputLevel,
      maxRetries: video.maxRetries,
      retries: video.retries || 0,
      logs: video.logs || []
    };
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'UPLOADED': {
        label: 'Carregado',
        color: '#CE93D8', // Roxo médio (mais intenso que o pastel anterior)
        textColor: '#4A148C' // Roxo escuro para contraste
      },
      'PROCESSING': {
        label: 'Processando',
        color: '#CE93D8', // Roxo médio para o gradiente
        textColor: '#4A148C', // Roxo escuro para contraste
        isProcessing: true
      },
      'FINISHED': {
        label: 'Concluído',
        color: '#A5D6A7', // Verde médio (mais intenso)
        textColor: '#1B5E20' // Verde escuro para contraste
      },
      'FAILED': {
        label: 'Falhou',
        color: '#EF9A9A', // Vermelho médio (mais intenso)
        textColor: '#B71C1C' // Vermelho escuro para contraste
      },
      'RETRYING': {
        label: 'Retentativa Agendada',
        color: '#FFF176', // Amarelo médio (mais intenso)
        textColor: '#E65100', // Laranja escuro para melhor contraste
      }
    };

    const statusInfo = statusMap[status] || {
      label: status,
      color: '#F5F5F5',
      textColor: '#424242'
    };

    return (
      <Chip
        label={statusInfo.label}
        size="small"
        sx={{
          backgroundColor: statusInfo.color,
          color: statusInfo.textColor,
          fontWeight: 'bold',
          textAlign: 'center',
          alignItems: 'center',
          alignSelf: 'center',
          px: 0.5,
          py: 0.25,
          fontSize: '0.8125rem',
          minHeight: '20px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          height: 'auto',
          ...(statusInfo.isProcessing && {
            animation: `${pulseAnimation} 1.5s ease-in-out infinite`
          })
        }}
      />
    );
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <TableCell colSpan={5} sx={{ fontWeight: 'bold', textAlign: 'center', borderBottom: 2, borderColor: '#c5cae9', py: 0.5, px: 1, fontSize: '0.8125rem', color: 'white' }}>
                Identificação
              </TableCell>
              <TableCell colSpan={2} sx={{ fontWeight: 'bold', textAlign: 'center', borderBottom: 2, borderColor: '#c5cae9', py: 0.5, px: 1, fontSize: '0.8125rem', color: 'white' }}>
                Ações
              </TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: '#f3e5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 0.5, px: 1, fontSize: '0.8125rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('id')}>
                ID <span style={{ fontSize: '1.125rem', opacity: 0.5, marginLeft: '2px' }}>{sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</span>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 0.5, px: 1, fontSize: '0.8125rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('fileName')}>
                Arquivo <span style={{ fontSize: '1.125rem', opacity: 0.5, marginLeft: '2px' }}>{sortConfig.key === 'fileName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</span>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 0.5, px: 1, fontSize: '0.8125rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('uploadDate')}>
                Data de Upload <span style={{ fontSize: '1.125rem', opacity: 0.5, marginLeft: '2px' }}>{sortConfig.key === 'uploadDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</span>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 0.5, px: 1, fontSize: '0.8125rem', textAlign: 'center', color: 'text.secondary' }} onClick={() => requestSort('duration')}>
                Duração <span style={{ fontSize: '1.125rem', opacity: 0.5, marginLeft: '2px' }}>{sortConfig.key === 'duration' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</span>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', py: 0.5, px: 0.25, fontSize: '0.8125rem', textAlign: 'center', color: 'text.secondary', width: '80px', minWidth: '80px' }} onClick={() => requestSort('status')}>
                Status <span style={{ fontSize: '1.125rem', opacity: 0.5, marginLeft: '2px' }}>{sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</span>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 0.5, px: 1, fontSize: '0.8125rem', color: 'text.secondary' }}>Download</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 0.5, px: 1, fontSize: '0.8125rem', color: 'text.secondary' }}>Logs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Nenhum vídeo encontrado com os filtros aplicados
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                    Tente ajustar os filtros ou limpar a pesquisa
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedVideos.map((video) => (
                <React.Fragment key={video.id}>
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', bgcolor: sortedVideos.indexOf(video) % 2 === 0 ? '#ffffff' : '#f8f6fa' }}
                    onClick={() => toggleRow(video.id)}
                  >
                    <TableCell sx={{ py: 0.5, px: 1, textAlign: 'center', color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton size="small" sx={{ p: 0.25 }}>
                          {expandedRows.has(video.id) ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                        </IconButton>
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{video.id}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 0.5, px: 1, textAlign: 'center', color: 'text.secondary' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8125rem' }}>
                          {video.fileName}.{video.fileExtension}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.8125rem', textAlign: 'center', color: 'text.secondary' }}>{formatDate(video.uploadDate)}</TableCell>
                    <TableCell sx={{ py: 0.5, px: 1, fontSize: '0.8125rem', textAlign: 'center', color: 'text.secondary' }}>{formatDuration(video.duration)}</TableCell>
                    <TableCell sx={{ py: 0.5, px: 0.25, textAlign: 'center', width: '80px', minWidth: '80px' }}>{getStatusBadge(video.status)}</TableCell>
                    <TableCell sx={{ textAlign: 'center', py: 0.5, px: 0.5 }}>
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
                    <TableCell sx={{ textAlign: 'center', py: 0.5, px: 0.5 }}>
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
                        <Box sx={{ p: 1, bgcolor: '#ede7f6', borderLeft: '4px solid #5a3d9a' }}>
                          <Typography variant="h6" gutterBottom sx={{ fontSize: '0.9375rem', mb: 0.75, color: '#1a0033', fontWeight: 'bold' }}>
                            Informações de Processamento
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 0.75 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Unidade de Tempo:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{formatTimeUnit(video.timeUnit)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Tempo Inicial:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{video.startTime ?? '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Tempo Final:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{video.endTime ?? '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Intervalo:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{video.interval || '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Tamanho:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{formatResize(video.resize)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Qualidade:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{formatQuality(video.quality)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Máx. Retentativas:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{video.maxRetries ?? '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Retentativas:</Typography>
                              <Typography variant="body1" sx={{ fontSize: '0.813rem', color: 'text.secondary' }}>{video.retries ?? 0}</Typography>
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
