import React from 'react';
import {
    Box,
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography
} from '@mui/material';
import {Clear as ClearIcon, Search as SearchIcon} from '@mui/icons-material';

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
           filters.fileExtension;
  };

  return (
    <Paper sx={{ p: 1, mb: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>
          <SearchIcon sx={{ fontSize: '1rem' }} />
          Filtros de Pesquisa
        </Typography>
        {hasActiveFilters() && (
          <Button
            variant="outlined"
            startIcon={<ClearIcon sx={{ fontSize: '0.875rem' }} />}
            onClick={onClearFilters}
            size="small"
            title="Limpar todos os filtros"
            sx={{ fontSize: '0.75rem', py: 0.25, px: 1, minHeight: 0 }}
          >
            Limpar Filtros
          </Button>
        )}
      </Box>

      <Grid container spacing={1} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {/* Busca por ID */}
        <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <TextField
            id="filter-id"
            label="ID"
            type="text"
            placeholder="Buscar por ID..."
            value={filters.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{ sx: { fontSize: '0.8rem', height: 32 } }}
            InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
          />
        </Box>

        {/* Busca por nome do arquivo */}
        <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <TextField
            id="filter-search"
            label="Nome do Arquivo"
            type="text"
            placeholder="Buscar por nome..."
            value={filters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{ sx: { fontSize: '0.8rem', height: 32 } }}
            InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
          />
        </Box>

        {/* Filtro de Extensão */}
        <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-extension-label" sx={{ fontSize: '0.8rem' }}>Extensão</InputLabel>
            <Select
              id="filter-extension"
              labelId="filter-extension-label"
              value={filters.fileExtension}
              onChange={(e) => handleInputChange('fileExtension', e.target.value)}
              label="Extensão"
              sx={{ fontSize: '0.8rem', height: 32 }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8rem' }}><em>Todas as extensões</em></MenuItem>
              <MenuItem value="mp4" sx={{ fontSize: '0.8rem' }}>MP4</MenuItem>
              <MenuItem value="avi" sx={{ fontSize: '0.8rem' }}>AVI</MenuItem>
              <MenuItem value="mov" sx={{ fontSize: '0.8rem' }}>MOV</MenuItem>
              <MenuItem value="mkv" sx={{ fontSize: '0.8rem' }}>MKV</MenuItem>
              <MenuItem value="webm" sx={{ fontSize: '0.8rem' }}>WEBM</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Filtro de Status */}
        <Box sx={{ flex: '1 1 180px', minWidth: '180px' }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-status-label" sx={{ fontSize: '0.8rem' }}>Status</InputLabel>
            <Select
              id="filter-status"
              labelId="filter-status-label"
              value={filters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              label="Status"
              sx={{ fontSize: '0.8rem', height: 32 }}
            >
              <MenuItem value="" sx={{ fontSize: '0.8rem' }}><em>Todos os status</em></MenuItem>
              <MenuItem value="UPLOADED" sx={{ fontSize: '0.8rem' }}>Carregado</MenuItem>
              <MenuItem value="PROCESSING" sx={{ fontSize: '0.8rem' }}>Processando</MenuItem>
              <MenuItem value="FINISHED" sx={{ fontSize: '0.8rem' }}>Concluído</MenuItem>
              <MenuItem value="FAILED" sx={{ fontSize: '0.8rem' }}>Falhou</MenuItem>
              <MenuItem value="RETRYING" sx={{ fontSize: '0.8rem' }}>Retentativa Agendada</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Grid>
    </Paper>
  );
};

export default VideoFilters;
