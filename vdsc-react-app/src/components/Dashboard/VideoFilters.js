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
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.125rem' }}>
          <SearchIcon />
          Filtros de Pesquisa
        </Typography>
        {hasActiveFilters() && (
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            size="small"
            title="Limpar todos os filtros"
          >
            Limpar Filtros
          </Button>
        )}
      </Box>

      <Grid container spacing={2} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {/* Busca por ID */}
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <TextField
            id="filter-id"
            label="ID"
            type="number"
            placeholder="Buscar por ID..."
            value={filters.id}
            onChange={(e) => handleInputChange('id', e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          />
        </Box>

        {/* Busca por nome do arquivo */}
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
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
          />
        </Box>

        {/* Filtro de Extensão */}
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-extension-label">Extensão</InputLabel>
            <Select
              id="filter-extension"
              labelId="filter-extension-label"
              value={filters.fileExtension}
              onChange={(e) => handleInputChange('fileExtension', e.target.value)}
              label="Extensão"
            >
              <MenuItem value=""><em>Todas as extensões</em></MenuItem>
              <MenuItem value="mp4">MP4</MenuItem>
              <MenuItem value="avi">AVI</MenuItem>
              <MenuItem value="mov">MOV</MenuItem>
              <MenuItem value="mkv">MKV</MenuItem>
              <MenuItem value="webm">WEBM</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Filtro de Status */}
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="filter-status-label">Status</InputLabel>
            <Select
              id="filter-status"
              labelId="filter-status-label"
              value={filters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              label="Status"
            >
              <MenuItem value=""><em>Todos os status</em></MenuItem>
              <MenuItem value="UPLOADED">Carregado</MenuItem>
              <MenuItem value="PROCESSING">Processando</MenuItem>
              <MenuItem value="FINISHED">Concluído</MenuItem>
              <MenuItem value="FAILED">Falhou</MenuItem>
              <MenuItem value="RETRYING">Tentando Novamente</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Grid>
    </Paper>
  );
};

export default VideoFilters;
