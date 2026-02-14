import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getCurrentUser } from 'aws-amplify/auth';
import { videoAPI, uploadToS3 } from '../../services/api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Generate short UUID (12 characters)
const generateShortUUID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const timestamp = Date.now().toString(36);
  result += timestamp;
  
  while (result.length < 12) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result.substring(0, 12);
};

const UploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [videoId, setVideoId] = useState('');
  const [uploadInfo, setUploadInfo] = useState(null);
  const [preparingUpload, setPreparingUpload] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const uploadAbortController = useRef(null);
  
  // Video metadata
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoExtension, setVideoExtension] = useState('');
  const [videoResolution, setVideoResolution] = useState({ width: 0, height: 0 });
  
  // Form data
  const [formData, setFormData] = useState({
    fileName: '',
    timeUnit: 'seconds',
    startTime: 0,
    endTime: 0,
    interval: '',
    quality: 'original',
    qualityOutputLevel: 80
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);

  // Allowed video formats
  const ALLOWED_FORMATS = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  const loadVideoMetadata = useCallback((file) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      setVideoDuration(video.duration);
      
      // Get video resolution
      const width = video.videoWidth;
      const height = video.videoHeight;
      setVideoResolution({ width, height });
      
      // Set initial endTime based on duration
      const maxDuration = formData.timeUnit === 'milliseconds' ? 
        Math.floor(video.duration * 1000) : 
        Math.floor(video.duration);
      
      // Determine initial quality based on resolution
      const minSide = Math.min(width, height);
      const initialQuality = 'original';
      // Always use original quality as default, regardless of resolution

      setFormData(prev => ({
        ...prev,
        endTime: maxDuration,
        quality: initialQuality
      }));
    };

    video.src = URL.createObjectURL(file);
  }, [formData.timeUnit]);

  useEffect(() => {
    if (file) {
      loadVideoMetadata(file);
    }
  }, [file, loadVideoMetadata]);

  useEffect(() => {
    if (videoDuration > 0 && formData.endTime === 0) {
      setFormData(prev => ({
        ...prev,
        endTime: formData.timeUnit === 'milliseconds' ?
          Math.floor(videoDuration * 1000) :
          Math.floor(videoDuration)
      }));
    }
  }, [videoDuration, formData.timeUnit]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (selectedFile) => {
    setError('');
    setUploadInfo(null);
    
    // Validate file type
    const extensionFile = selectedFile.name.split('.').pop().toLowerCase();
    if (!ALLOWED_FORMATS.includes(extensionFile)) {
      setError(`Formato não suportado. Permitidos: ${ALLOWED_FORMATS.join(', ')}`);
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setFile(selectedFile);
    setVideoExtension(extensionFile);
    
    // Generate unique video ID
    const newVideoId = generateShortUUID();
    setVideoId(newVideoId);
    
    // Set original file name (without extension) - read-only
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setFormData(prev => ({
      ...prev,
      fileName: nameWithoutExt
    }));

    // Immediately get presigned upload URL
    setPreparingUpload(true);
    try {
      // Format: videoId.fileExtension
      const uploadFileName = `${newVideoId}.${extensionFile}`;

      const uploadData = await videoAPI.getUploadUrl(uploadFileName);

      setUploadInfo({
        uploadUrl: uploadData.uploadUrl,
        fileName: uploadData.fileName,
        s3Key: uploadData.s3Key,
        expiresIn: uploadData.expiresIn
      });
    } catch (err) {
      setError('Erro ao preparar upload. Tente novamente.');
      setFile(null);
      setVideoId('');
    } finally {
      setPreparingUpload(false);
    }
  };

  // Check if interval has multiple values (comma-separated)
  const isMultipleIntervals = (intervalValue) => {
    return intervalValue && intervalValue.includes(',');
  };

  // Calculate total number of images that will be captured
  const calculateTotalImages = () => {
    if (!formData.interval.trim() || !videoDuration) return 0;

    const maxDuration = getMaxDuration();
    const intervals = formData.interval.split(',').map(i => parseFloat(i.trim())).filter(n => !isNaN(n));

    if (intervals.length === 0) return 0;

    if (intervals.length === 1) {
      // Single interval - regular capture
      const interval = intervals[0];
      if (interval <= 0 || interval > maxDuration) return 0;

      const startTime = parseFloat(formData.startTime) || 0;
      const endTime = parseFloat(formData.endTime) || maxDuration;

      if (startTime >= endTime) return 0;

      const moments = [];
      for (let t = startTime; t <= endTime; t += interval) {
        moments.push(t);
      }

      return moments.length;
    } else {
      // Multiple intervals - specific moments
      const validMoments = intervals.filter(m => m >= 0 && m <= maxDuration);
      return validMoments.length;
    }
  };

  // Calculate preview message
  const calculatePreview = () => {
    if (!formData.interval.trim() || !videoDuration) return null;

    const maxDuration = getMaxDuration();
    const intervals = formData.interval.split(',').map(i => parseFloat(i.trim())).filter(n => !isNaN(n));

    if (intervals.length === 0) return null;

    if (intervals.length === 1) {
      // Single interval - regular capture
      const interval = intervals[0];
      if (interval <= 0 || interval > maxDuration) return null;

      const startTime = parseFloat(formData.startTime) || 0;
      const endTime = parseFloat(formData.endTime) || maxDuration;

      if (startTime >= endTime) return null;

      const moments = [];
      for (let t = startTime; t <= endTime; t += interval) {
        moments.push(t);
      }

      const unit = formData.timeUnit === 'milliseconds' ? 'ms' : 's';
      const totalImages = moments.length;

      if (moments.length <= 6) {
        return `Serão capturadas ${totalImages} imagens nos momentos ${moments.map(m => `${m}${unit}`).join(', ')}`;
      } else {
        const first3 = moments.slice(0, 3).map(m => `${m}${unit}`).join(', ');
        const last3 = moments.slice(-3).map(m => `${m}${unit}`).join(', ');
        return `Serão capturadas ${totalImages} imagens nos momentos ${first3} ... ${last3}`;
      }
    } else {
      // Multiple intervals - specific moments
      const validMoments = intervals.filter(m => m >= 0 && m <= maxDuration).sort((a, b) => a - b);
      const invalidMoments = intervals.filter(m => m < 0 || m > maxDuration);

      if (validMoments.length === 0) return null;

      const unit = formData.timeUnit === 'milliseconds' ? 'ms' : 's';
      let message = `Serão capturadas ${validMoments.length} imagens nos momentos ${validMoments.map(m => `${m}${unit}`).join(', ')}`;

      if (invalidMoments.length > 0) {
        message += `. Os valores fora do intervalo válido serão desprezados`;
      }

      return message;
    }
  };

  // Calculate resize preview message
  const calculateResizePreview = () => {
    if (!videoResolution.width || !videoResolution.height || formData.quality === 'original') {
      return null;
    }

    const qualityTargets = {
      'ultra': 1080,
      'high': 720,
      'medium': 480,
      'low': 360
    };

    const targetSize = qualityTargets[formData.quality];
    if (!targetSize) return null;

    const { width, height } = videoResolution;
    const aspectRatio = width / height;

    let newWidth, newHeight;

    if (width > height) {
      // Landscape video
      newHeight = targetSize;
      newWidth = Math.round(targetSize * aspectRatio);
    } else {
      // Portrait or square video
      newWidth = targetSize;
      newHeight = Math.round(targetSize / aspectRatio);
    }

    return `Novo Tamanho: ${newWidth}x${newHeight}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Handle interval changes - check if multiple values
    if (name === 'interval') {
      const hasMultiple = isMultipleIntervals(value);
      const maxDuration = getMaxDuration();

      if (hasMultiple) {
        // Lock start and end times when multiple intervals
        setFormData(prev => ({
          ...prev,
          [name]: value,
          startTime: 0,
          endTime: maxDuration
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (name === 'startTime' || name === 'endTime') {
      // Convert to number for time fields
      const numValue = value === '' ? 0 : parseFloat(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Validate on change
    setTimeout(() => validateField(name, value), 0);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const validateField = (fieldName, value) => {
    const errors = { ...validationErrors };
    const maxDuration = getMaxDuration();
    const startTime = fieldName === 'startTime' ? parseFloat(value) : parseFloat(formData.startTime);
    const endTime = fieldName === 'endTime' ? parseFloat(value) : parseFloat(formData.endTime);

    switch (fieldName) {
      case 'startTime':
        const startVal = parseFloat(value);
        if (isNaN(startVal) || startVal < 0) {
          errors.startTime = 'Tempo inicial deve ser maior ou igual a 0';
        } else if (startVal >= endTime) {
          errors.startTime = 'Tempo inicial deve ser menor que o tempo final';
        } else {
          delete errors.startTime;
        }
        // Re-validate endTime when startTime changes
        if (endTime <= startVal) {
          errors.endTime = 'Tempo final deve ser maior que o tempo inicial';
        } else if (endTime > maxDuration) {
          errors.endTime = 'Tempo final deve ser menor ou igual à duração do vídeo';
        } else {
          delete errors.endTime;
        }
        break;

      case 'endTime':
        const endVal = parseFloat(value);
        if (isNaN(endVal) || endVal > maxDuration) {
          errors.endTime = 'Tempo final deve ser menor ou igual à duração do vídeo';
        } else if (endVal <= startTime) {
          errors.endTime = 'Tempo final deve ser maior que o tempo inicial';
        } else {
          delete errors.endTime;
        }
        // Re-validate startTime when endTime changes
        if (startTime >= endVal) {
          errors.startTime = 'Tempo inicial deve ser menor que o tempo final';
        } else if (startTime < 0) {
          errors.startTime = 'Tempo inicial deve ser maior ou igual a 0';
        } else {
          delete errors.startTime;
        }
        break;

      case 'interval':
        const intervalValue = fieldName === 'interval' ? value : formData.interval;
        if (!intervalValue || !intervalValue.trim()) {
          errors.interval = 'Intervalo é obrigatório';
        } else {
          const intervals = intervalValue.split(',').map(i => i.trim());
          const hasMultiple = intervals.length > 1;

          if (!hasMultiple) {
            // Single value
            const num = parseFloat(intervals[0]);
            if (isNaN(num) || num <= 0) {
              errors.interval = 'Intervalo deve ser um número maior que zero';
            } else if (num > maxDuration) {
              errors.interval = 'Intervalo deve ser menor ou igual à duração do vídeo';
            } else {
              delete errors.interval;
            }
          } else {
            // Multiple values
            const hasInvalid = intervals.some(interval => {
              const num = parseFloat(interval);
              return isNaN(num) || num < 0;
            });

            if (hasInvalid) {
              errors.interval = 'Todos os valores devem ser números maiores ou iguais a zero';
            } else {
              const allOutOfRange = intervals.every(interval => {
                const num = parseFloat(interval);
                return num > maxDuration;
              });

              if (allOutOfRange) {
                errors.interval = 'Pelo menos um valor deve estar dentro da duração do vídeo';
              } else {
                delete errors.interval;
              }
            }
          }
        }
        break;

      default:
        break;
    }

    // Validate maximum images limit (100) for relevant fields
    if (['interval', 'startTime', 'endTime', 'timeUnit'].includes(fieldName)) {
      const totalImages = calculateTotalImages();
      if (totalImages > 100) {
        errors.maxImages = `Revise os parâmetros! Seriam capturadas ${totalImages} imagens. Limite máximo de 100 imagens por processamento`;
      } else {
        delete errors.maxImages;
      }
    }

    setValidationErrors(errors);
  };

  const handleTimeUnitChange = (e) => {
    const newUnit = e.target.value;
    const oldUnit = formData.timeUnit;
    
    let newStartTime = formData.startTime;
    let newEndTime = formData.endTime;
    
    // Convert times when switching units
    if (oldUnit === 'seconds' && newUnit === 'milliseconds') {
      newStartTime = formData.startTime * 1000;
      newEndTime = formData.endTime * 1000;
    } else if (oldUnit === 'milliseconds' && newUnit === 'seconds') {
      newStartTime = Math.floor(formData.startTime / 1000);
      newEndTime = Math.floor(formData.endTime / 1000);
    }
    
    setFormData(prev => ({
      ...prev,
      timeUnit: newUnit,
      startTime: newStartTime,
      endTime: newEndTime
    }));

    // Validate after changing time unit
    setTimeout(() => validateField('timeUnit', newUnit), 0);
  };

  const getMaxDuration = () => {
    return formData.timeUnit === 'milliseconds' ? 
      Math.floor(videoDuration * 1000) : 
      Math.floor(videoDuration);
  };

  const isQualityAvailable = (quality) => {
    const minSide = Math.min(videoResolution.width, videoResolution.height);
    switch (quality) {
      case 'original':
        // Original: always available
        return true;
      case 'ultra':
        // Ultra (1080p): requires min side >= 1080
        return minSide >= 1080;
      case 'high':
        // Alta (720p): requires min side >= 720
        return minSide >= 720;
      case 'medium':
        // Média (480p): requires min side >= 480
        return minSide >= 480;
      case 'low':
        // Baixa (360p): requires min side >= 360
        return minSide >= 360;
      default:
        return false;
    }
  };

  const validateForm = async () => {
    const errors = {};
    
    if (!file) {
      errors.file = 'Selecione um arquivo';
    }
    
    const maxDuration = getMaxDuration();
    const startTime = parseFloat(formData.startTime);
    const endTime = parseFloat(formData.endTime);

    // Validate startTime
    if (isNaN(startTime) || startTime < 0) {
      errors.startTime = 'Tempo inicial deve ser maior ou igual a 0';
    } else if (startTime >= endTime) {
      errors.startTime = 'Tempo inicial deve ser menor que o tempo final';
    }
    
    // Validate endTime
    if (isNaN(endTime) || endTime > maxDuration) {
      errors.endTime = 'Tempo final deve ser menor ou igual à duração do vídeo';
    } else if (endTime <= startTime) {
      errors.endTime = 'Tempo final deve ser maior que o tempo inicial';
    }
    
    // Validate interval
    if (!formData.interval.trim()) {
      errors.interval = 'Intervalo é obrigatório';
    } else {
      const intervals = formData.interval.split(',').map(i => i.trim());
      const hasMultiple = intervals.length > 1;

      if (!hasMultiple) {
        const num = parseFloat(intervals[0]);
        if (isNaN(num) || num <= 0) {
          errors.interval = 'Intervalo deve ser um número maior que zero';
        } else if (num > maxDuration) {
          errors.interval = 'Intervalo deve ser menor ou igual à duração do vídeo';
        }
      } else {
        const hasInvalid = intervals.some(interval => {
          const num = parseFloat(interval);
          return isNaN(num) || num < 0;
        });

        if (hasInvalid) {
          errors.interval = 'Todos os valores devem ser números maiores ou iguais a zero';
        } else {
          const allOutOfRange = intervals.every(interval => {
            const num = parseFloat(interval);
            return num > maxDuration;
          });

          if (allOutOfRange) {
            errors.interval = 'Pelo menos um valor deve estar dentro da duração do vídeo';
          }
        }
      }
    }
    
    // Validate maximum images limit (100)
    const totalImages = calculateTotalImages();
    if (totalImages > 100) {
      errors.maxImages = `Revise os parâmetros! Seriam capturadas ${totalImages} imagens. Limite máximo de 100 imagens por processamento`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCancelUpload = () => {
    if (uploading && uploadAbortController.current) {
      uploadAbortController.current.abort();
      uploadAbortController.current = null;
    }
    setCancelMessage('Upload Cancelado');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }
    
    // Check if we have upload info
    if (!uploadInfo || !uploadInfo.uploadUrl) {
      setError('Informações de upload não disponíveis. Tente selecionar o arquivo novamente.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    uploadAbortController.current = new AbortController();
    
    try {
      // Step 1: Upload file to S3 using pre-obtained URL
      await uploadToS3(uploadInfo.uploadUrl, file, (progress) => {
        setUploadProgress(progress);
      }, uploadAbortController.current.signal);
      
      // Step 2: Get current user ID
      const user = await getCurrentUser();
      const userId = user.userId;
      
      // Map quality to API format
      const qualityMap = {
        'original': 'original',
        'ultra': 'ultra',
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
      };
      
      // Parse interval to array format
      const timeIntervalArray = formData.interval.split(',').map(i => i.trim());
      
      // Format timestamp as ISO 8601 (2026-01-13T00:00:00Z) - without milliseconds
      const now = new Date();
      const timestamp = now.toISOString().split('.')[0] + 'Z';

      // Step 3: Send metadata to API Gateway

      // Create upload log entry
      const uploadLog = {
        timestamp: timestamp,
        info: `Upload realizado com sucesso`
      };

      const videoMetadata = {
        videoId: videoId,
        fileName: formData.fileName,
        fileExtension: videoExtension,
        status: 'UPLOADED',
        created: timestamp,
        userId: userId,
        totalTime: Math.floor(videoDuration),
        unitTime: formData.timeUnit === 'seconds' ? 's' : 'ms',
        startTime: parseFloat(formData.startTime),
        endTime: parseFloat(formData.endTime),
        intervalTime: timeIntervalArray,
        maxRetries: parseInt(process.env.REACT_APP_MAX_RETRY || '3'),
        retries: 0,
        resize: qualityMap[formData.quality] || 'medium',
        qualityOutputLevel: parseInt(formData.qualityOutputLevel),
        logs: [uploadLog]
      };
      
      await videoAPI.uploadVideoMetadata(videoMetadata);
      
      // Success!
      onSuccess();
    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'Upload cancelado') {
        return;
      }
      setError(err.message || 'Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      uploadAbortController.current = null;
    }
  };

  const isFormValid = () => {
    // Basic checks
    if (!file || !videoId || !uploadInfo || !uploadInfo.uploadUrl || !formData.interval.trim() || preparingUpload) {
      return false;
    }

    // Check validation errors (including maxImages limit)
    if (Object.keys(validationErrors).length > 0) {
      return false;
    }

    // Explicit time validations
    const maxDuration = getMaxDuration();
    const startTime = parseFloat(formData.startTime);
    const endTime = parseFloat(formData.endTime);

    if (isNaN(startTime) || startTime < 0 || startTime >= endTime) {
      return false;
    }

    if (isNaN(endTime) || endTime > maxDuration || endTime <= startTime) {
      return false;
    }

    // Validate interval
    const intervals = formData.interval.split(',').map(i => i.trim());
    if (intervals.length === 1) {
      const num = parseFloat(intervals[0]);
      if (isNaN(num) || num <= 0 || num > maxDuration) {
        return false;
      }
    } else {
      const hasValidValue = intervals.some(interval => {
        const num = parseFloat(interval);
        return !isNaN(num) && num >= 0 && num <= maxDuration;
      });
      if (!hasValidValue) {
        return false;
      }
    }

    return true;
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Upload Novo Vídeo</Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={uploading ? handleCancelUpload : onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {cancelMessage ? (
          <Alert severity="info" sx={{ mb: 1 }}>
            {cancelMessage}
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {/* Drag and Drop Area */}
            <Paper
              sx={{
                p: 2,
                mb: 2,
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'grey.300',
                bgcolor: dragActive ? 'primary.50' : 'grey.50',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minHeight: 120
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FORMATS.map(f => `.${f}`).join(',')}
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />

              {!file ? (
                <Box sx={{ py: 1 }}>
                  <CloudUploadIcon sx={{ fontSize: 36, color: 'grey.400', mb: 0.5 }} />
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                    Arraste um vídeo aqui ou clique para selecionar
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Formatos aceitos: {ALLOWED_FORMATS.join(', ')} | Máx: 500MB
                  </Typography>
                </Box>
              ) : preparingUpload ? (
                <Box sx={{ py: 1 }}>
                  <CircularProgress size={24} sx={{ mb: 0.5 }} />
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                    Preparando upload...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Obtendo URL de upload
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ py: 1 }}>
                  <Typography variant="h6" color="success.main" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                    ✓ {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                    {uploadInfo && uploadInfo.expiresIn && (
                      <span style={{ marginLeft: '8px', color: 'primary.main' }}>
                        • Link expira em {uploadInfo.expiresIn}
                      </span>
                    )}
                  </Typography>
                </Box>
              )}
            </Paper>

            {validationErrors.file && (
              <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>
                {validationErrors.file}
              </Alert>
            )}

            {file && (
              <Box>
                {/* Non-editable Properties */}
                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontSize: '1.125rem', mb: 1 }}>
                  Propriedades do Arquivo
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="ID do Vídeo"
                      value={videoId}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Arquivo"
                      value={`${formData.fileName}${videoExtension ? `.${videoExtension}` : ''}`}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Duração"
                      value={
                        formData.timeUnit === 'milliseconds'
                          ? `${Math.floor(videoDuration * 1000)} ms`
                          : `${Math.floor(videoDuration)} s`
                      }
                      fullWidth
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                </Grid>

                {/* Editable Properties */}
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.125rem', mb: 1 }}>
                  Configurações de Processamento
                </Typography>

                {/* First Row: Tamanho and Qualidade */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="quality-label">Tamanho</InputLabel>
                      <Select
                        labelId="quality-label"
                        id="quality"
                        name="quality"
                        value={formData.quality}
                        onChange={handleInputChange}
                        label="Tamanho"
                      >
                        <MenuItem value="original">Original</MenuItem>
                        <MenuItem value="ultra" disabled={!isQualityAvailable('ultra')}>
                          Ultra - 1080p {!isQualityAvailable('ultra') && '(Indisponível)'}
                        </MenuItem>
                        <MenuItem value="high" disabled={!isQualityAvailable('high')}>
                          Alta - 720p {!isQualityAvailable('high') && '(Indisponível)'}
                        </MenuItem>
                        <MenuItem value="medium" disabled={!isQualityAvailable('medium')}>
                          Média - 480p {!isQualityAvailable('medium') && '(Indisponível)'}
                        </MenuItem>
                        <MenuItem value="low">Baixa - 360p</MenuItem>
                      </Select>
                    </FormControl>
                    {videoResolution.height > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                        Resolução: {videoResolution.width}x{videoResolution.height}
                        {calculateResizePreview() && (
                          <span style={{ marginLeft: '4px', color: 'primary.main' }}>
                            → <strong>{calculateResizePreview().replace('Novo Tamanho: ', '')}</strong>
                          </span>
                        )}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" gutterBottom sx={{ fontSize: '0.875rem' }}>
                      Qualidade: <strong>{formData.qualityOutputLevel}%</strong>
                    </Typography>
                    <Slider
                      value={formData.qualityOutputLevel}
                      onChange={(e, newValue) => handleInputChange({ target: { name: 'qualityOutputLevel', value: newValue } })}
                      aria-labelledby="quality-slider"
                      min={1}
                      max={100}
                      valueLabelDisplay="auto"
                      marks
                      step={5}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Qualidade de saída (1 = baixa, 100 = máxima)
                    </Typography>
                  </Grid>
                </Grid>

                {/* Second Row: Unidade de Tempo + Faixa de Captura */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="timeUnit-label">Unidade *</InputLabel>
                      <Select
                        labelId="timeUnit-label"
                        id="timeUnit"
                        name="timeUnit"
                        value={formData.timeUnit}
                        onChange={handleTimeUnitChange}
                        label="Unidade *"
                      >
                        <MenuItem value="seconds">Segundos</MenuItem>
                        <MenuItem value="milliseconds">Milissegundos</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <Typography variant="body2" gutterBottom sx={{ fontSize: '0.875rem' }}>Faixa de Captura *</Typography>
                    <Box sx={{ px: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                          Início: <strong>{formData.startTime}</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                          Fim: <strong>{formData.endTime}</strong>
                        </Typography>
                      </Box>
                      <Slider
                        value={[formData.startTime, formData.endTime]}
                        onChange={(e, newValue) => {
                          handleInputChange({ target: { name: 'startTime', value: newValue[0].toString() } });
                          handleInputChange({ target: { name: 'endTime', value: newValue[1].toString() } });
                        }}
                        aria-labelledby="time-range-slider"
                        min={0}
                        max={getMaxDuration()}
                        valueLabelDisplay="auto"
                        disabled={isMultipleIntervals(formData.interval)}
                        size="small"
                      />
                      {isMultipleIntervals(formData.interval) && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          Bloqueado: múltiplos intervalos definidos
                        </Typography>
                      )}
                      {(validationErrors.startTime || validationErrors.endTime) && (
                        <Alert severity="error" sx={{ mt: 0.5, py: 0.25, fontSize: '0.75rem' }}>
                          {validationErrors.startTime || validationErrors.endTime}
                        </Alert>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {/* Third Row: Intervalo */}
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Intervalo *"
                    id="interval"
                    name="interval"
                    value={formData.interval}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    error={!!validationErrors.interval}
                    helperText={
                      <>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                          Preencher com único valor captura recorrente entre tempo inicial e tempo final. Ex: 10<br />
                          Preencher com valores separados por vírgula para capturar momentos específicos. Ex: 10,21,22,33,55
                        </Typography>
                      </>
                    }
                    placeholder="Ex: 5 ou 10,20,30,40"
                    variant="outlined"
                    size="small"
                  />
                  {validationErrors.interval && (
                    <Alert severity="error" sx={{ mt: 0.5, py: 0.25, fontSize: '0.75rem' }}>
                      {validationErrors.interval}
                    </Alert>
                  )}
                  {validationErrors.maxImages && (
                    <Alert severity="error" sx={{ mt: 0.5, py: 0.25, fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {validationErrors.maxImages}
                    </Alert>
                  )}
                  {calculatePreview() && !validationErrors.interval && (
                    <Alert severity="success" sx={{ mt: 0.5, py: 0.25, fontSize: '0.75rem' }}>
                      {calculatePreview()}
                    </Alert>
                  )}
                </Box>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 1, py: 0.5, fontSize: '0.875rem' }}>
                {error}
              </Alert>
            )}

            {uploading && (
              <Box sx={{ mb: 1 }}>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6 }} />
                <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
                  Enviando: {uploadProgress}%
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleCancelUpload}
          disabled={!uploading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!isFormValid() || uploading}
          onClick={handleSubmit}
        >
          {uploading ? 'Enviando...' : 'Enviar Vídeo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

UploadModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export default UploadModal;
