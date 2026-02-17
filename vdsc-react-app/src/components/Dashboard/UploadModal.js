import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {getCurrentUser} from 'aws-amplify/auth';
import {uploadToS3, videoAPI} from '../../services/api';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  TextField,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// LinearProgressWithLabel component
function LinearProgressWithLabel(props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="buffer" value={props.value} valueBuffer={100} sx={props.sx} />
      </Box>
      <Box sx={{ minWidth: 45 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: '0.875rem' }}>
          {`${Math.round(props.value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}

LinearProgressWithLabel.propTypes = {
  value: PropTypes.number.isRequired,
  sx: PropTypes.object
};

// Generate short UUID (12 characters)
const generateShortUUID = () => {
  // Gera um short hash com Base 62 (12 caracteres)
  // Base 62: 0-9 (10) + a-z (26) + A-Z (26) = 62 caracteres possíveis (sem caracteres especiais)
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
    resize: 'original',
    qualityOutputLevel: 80
  });

  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);

  // Allowed video formats
  const ALLOWED_FORMATS = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  const MAX_IMAGES = parseInt(process.env.REACT_APP_MAX_IMAGES || '100');

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

      // Always use original quality as default
      const initialQuality = 'original';

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

  // Calculate preview message - MEMOIZED
  const calculatePreview = useMemo(() => {
    return () => {
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

        const unit = formData.timeUnit === 'milliseconds' ? 'ms' : 's';
        const totalImages = validMoments.length;

        if (validMoments.length <= 6) {
          return `Serão capturadas ${totalImages} imagens nos momentos ${validMoments.map(m => `${m}${unit}`).join(', ')}`;
        } else {
          const first3 = validMoments.slice(0, 3).map(m => `${m}${unit}`).join(', ');
          const last3 = validMoments.slice(-3).map(m => `${m}${unit}`).join(', ');
          return `Serão capturadas ${totalImages} imagens nos momentos ${first3} ... ${last3}`;
        }
      }
    };
  }, [formData.interval, formData.startTime, formData.endTime, videoDuration, formData.timeUnit]);

  // Calculate resize preview message
  const calculateResizePreview = () => {
    if (!videoResolution.width || !videoResolution.height || formData.resize === 'original') {
      return null;
    }

    const qualityTargets = {
      'ultra': 1080,
      'high': 720,
      'medium': 480,
      'low': 360
    };

    const targetSize = qualityTargets[formData.resize];
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
        setFormData(prev => {
          const newData = {
            ...prev,
            [name]: value,
            startTime: 0,
            endTime: maxDuration
          };
          // Validate after state update
          setTimeout(() => validateField(name, value, newData), 0);
          return newData;
        });
      } else {
        setFormData(prev => {
          const newData = {
            ...prev,
            [name]: value
          };
          // Validate after state update
          setTimeout(() => validateField(name, value, newData), 0);
          return newData;
        });
      }
    } else if (name === 'startTime' || name === 'endTime') {
      // Convert to number for time fields
      const numValue = value === '' ? 0 : parseFloat(value);
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: numValue
        };
        // Validate after state update
        setTimeout(() => validateField(name, numValue, newData), 0);
        return newData;
      });
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        // Validate after state update
        setTimeout(() => validateField(name, value, newData), 0);
        return newData;
      });
    }
  };


  const validateField = (fieldName, value, updatedFormData = null) => {
    const errors = { ...validationErrors };
    const maxDuration = getMaxDuration();

    // Use updated data if provided, otherwise use current state
    const currentData = updatedFormData || formData;

    // Usa o valor passado para o campo sendo validado, ou busca do estado para outros campos
    let startTime, endTime, intervalValue;

    if (fieldName === 'startTime') {
      startTime = parseFloat(value);
      endTime = parseFloat(currentData.endTime);
      intervalValue = currentData.interval;
    } else if (fieldName === 'endTime') {
      startTime = parseFloat(currentData.startTime);
      endTime = parseFloat(value);
      intervalValue = currentData.interval;
    } else if (fieldName === 'interval') {
      startTime = parseFloat(currentData.startTime);
      endTime = parseFloat(currentData.endTime);
      intervalValue = value;
    } else {
      startTime = parseFloat(currentData.startTime);
      endTime = parseFloat(currentData.endTime);
      intervalValue = currentData.interval;
    }

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

    // Validate maximum images limit for relevant fields
    if (['interval', 'startTime', 'endTime', 'timeUnit'].includes(fieldName)) {
      // Calculate total images using current values instead of memoized function
      const totalImages = calculateTotalImagesDirectly(intervalValue, startTime, endTime, maxDuration);
      if (totalImages > MAX_IMAGES) {
        errors.maxImages = `Revise os parâmetros! Seriam capturadas ${totalImages} imagens. Limite máximo de ${MAX_IMAGES} imagens por processamento`;
      } else {
        delete errors.maxImages;
      }
    }

    setValidationErrors(errors);
  };

  // Helper function to calculate total images without memo dependency
  const calculateTotalImagesDirectly = (intervalValue, startTime, endTime, maxDuration) => {
    if (!intervalValue || !intervalValue.trim() || !videoDuration) return 0;

    const intervals = intervalValue.split(',').map(i => parseFloat(i.trim())).filter(n => !isNaN(n));

    if (intervals.length === 0) return 0;

    if (intervals.length === 1) {
      // Single interval - regular capture
      const interval = intervals[0];
      if (interval <= 0 || interval > maxDuration) return 0;

      const start = parseFloat(startTime) || 0;
      const end = parseFloat(endTime) || maxDuration;

      if (start >= end) return 0;

      const moments = [];
      for (let t = start; t <= end; t += interval) {
        moments.push(t);
      }

      return moments.length;
    } else {
      // Multiple intervals - specific moments
      const validMoments = intervals.filter(m => m >= 0 && m <= maxDuration);
      return validMoments.length;
    }
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

    setFormData(prev => {
      const newData = {
        ...prev,
        timeUnit: newUnit,
        startTime: newStartTime,
        endTime: newEndTime
      };
      // Validate after state update
      setTimeout(() => validateField('timeUnit', newUnit, newData), 0);
      return newData;
    });
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

    // Validate maximum images limit
    const totalImages = calculateTotalImagesDirectly(formData.interval, startTime, endTime, maxDuration);
    if (totalImages > MAX_IMAGES) {
      errors.maxImages = `Revise os parâmetros! Seriam capturadas ${totalImages} imagens. Limite máximo de ${MAX_IMAGES} imagens por processamento`;
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
        resize: qualityMap[formData.resize],
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
    <Dialog
      open
      onClose={() => {}}
      disableEscapeKeyDown
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{
        py: 0.5,
        background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', my: 0 }}>Upload Novo Vídeo</Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={uploading ? handleCancelUpload : onClose}
            aria-label="close"
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 2, mt: 1 }}>
        {cancelMessage ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            flexDirection: 'column'
          }}>
            <Alert
              severity="warning"
              sx={{
                width: 'auto',
                background: 'linear-gradient(135deg, rgba(76, 81, 191, 0.1) 0%, rgba(90, 61, 154, 0.1) 100%)',
                border: '2px solid #5a3d9a',
                '& .MuiAlert-icon': {
                  color: '#5a3d9a'
                },
                '& .MuiAlert-message': {
                  color: '#5a3d9a',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }
              }}
            >
              {cancelMessage}
            </Alert>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {uploading ? (
              // Mostrar apenas a barra de progresso quando estiver fazendo upload
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                gap: 2
              }}>
                <Typography variant="h6" sx={{ color: '#5a3d9a', fontWeight: 'bold' }}>
                  Enviando vídeo...
                </Typography>
                <Box sx={{ width: '80%' }}>
                  <LinearProgressWithLabel
                    value={uploadProgress}
                    sx={{
                      backgroundColor: 'rgba(76, 81, 191, 0.15)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #3f46e6 0%, #7c3aed 100%)'
                      },
                      '& .MuiLinearProgress-dashed': {
                        backgroundColor: 'rgba(76, 81, 191, 0.08)'
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                  Por favor, aguarde enquanto o arquivo está sendo enviado...
                </Typography>
              </Box>
            ) : (
              <>
            {/* Drag and Drop Area */}
            <Paper
              sx={{
                p: 0.5,
                mb: 1,
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'grey.300',
                bgcolor: dragActive ? '#f3e5f5' : '#f3e5f5',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s ease'
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
                <Box>
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'rgba(0, 0, 0, 0.6)', mb: 1 }} />
                  <Typography variant="h6" gutterBottom sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold' }}>
                    Arraste um vídeo aqui ou clique para selecionar
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                    Formatos aceitos: {ALLOWED_FORMATS.join(', ')} | Máx: 500MB
                  </Typography>
                </Box>
              ) : preparingUpload ? (
                <Box>
                  <LinearProgress
                    sx={{
                      mb: 0.5,
                      backgroundColor: 'rgba(76, 81, 191, 0.2)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)'
                      }
                    }}
                  />
                  <Typography variant="h6" gutterBottom sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold' }}>
                    Preparando upload...
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                    Obtendo URL de upload
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" color="success.main" gutterBottom sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold' }}>
                    ✓ {file.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                    {uploadInfo && uploadInfo.expiresIn && (
                      <span style={{ marginLeft: '8px', color: '#4c51bf', fontWeight: 'bold' }}>
                        • Link expira em {uploadInfo.expiresIn}
                      </span>
                    )}
                  </Typography>
                </Box>
              )}
            </Paper>

            {validationErrors.file && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {validationErrors.file}
              </Alert>
            )}

            {file && (
              <Box>
                {/* Non-editable Properties */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 1, color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold', textAlign: 'center' }}>
                  Propriedades do Arquivo
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2, justifyContent: 'center' }}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                        ID do Vídeo
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold' }}>
                        {videoId}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                        Nome do Arquivo
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold' }}>
                        {`${formData.fileName}.${videoExtension}`}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                        Duração
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold' }}>
                        {formData.timeUnit === 'milliseconds'
                          ? `${Math.floor(videoDuration * 1000)} ms`
                          : `${Math.floor(videoDuration)} s`}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Editable Properties */}
                <Typography variant="subtitle1" gutterBottom sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold', mb: 1 }}>
                  Configurações de Processamento
                </Typography>

                {/* First Row: Tamanho (25%) and Qualidade (75%) */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, width: '100%', alignItems: 'center' }}>
                  <Box sx={{ width: '25%', minWidth: 0 }}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="quality-label" sx={{
                        color: 'rgba(0, 0, 0, 0.6)',
                        '&.Mui-focused': {
                          color: '#5a3d9a'
                        }
                      }}>Tamanho</InputLabel>
                      <Select
                        labelId="quality-label"
                        id="quality"
                        name="resize"
                        value={formData.resize}
                        onChange={handleInputChange}
                        label="Tamanho"
                        variant="outlined"
                        sx={{
                          color: 'rgba(0, 0, 0, 0.6)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.6)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#5a3d9a'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#5a3d9a'
                          },
                          '&.Mui-focused': {
                            color: '#5a3d9a'
                          }
                        }}
                      >
                        <MenuItem value="original">Original</MenuItem>
                        <MenuItem value="ultra" disabled={!isQualityAvailable('ultra')}>
                          Ultra - 1080p {!isQualityAvailable('ultra') && '(Indisponível)'}
                        </MenuItem>
                        <MenuItem value="high" disabled={!isQualityAvailable('high')}>
                          Grande - 720p {!isQualityAvailable('high') && '(Indisponível)'}
                        </MenuItem>
                        <MenuItem value="medium" disabled={!isQualityAvailable('medium')}>
                          Médio - 480p {!isQualityAvailable('medium') && '(Indisponível)'}
                        </MenuItem>
                        <MenuItem value="low">Pequeno - 360p</MenuItem>
                      </Select>
                    </FormControl>
                    {videoResolution.height > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', color: 'rgba(0, 0, 0, 0.6)' }}>
                        Resolução: {videoResolution.width}x{videoResolution.height}
                        {calculateResizePreview() && (
                          <div style={{ marginTop: '4px', color: 'rgba(0, 0, 0, 0.6)' }}>
                            <strong>Novo tamanho: {calculateResizePreview().replace('Novo Tamanho: ', '')}</strong>
                          </div>
                        )}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ width: '75%', minWidth: 0 }}>
                    <Typography gutterBottom sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold', mb: 1 }}>
                      Qualidade: <strong>{formData.qualityOutputLevel}%</strong>
                    </Typography>
                    <Slider
                      value={formData.qualityOutputLevel}
                      onChange={(e, newValue) => handleInputChange({ target: { name: 'qualityOutputLevel', value: newValue } })}
                      aria-labelledby="quality-slider"
                      min={10}
                      max={100}
                      valueLabelDisplay="auto"
                      marks
                      step={5}
                      size="medium"
                      sx={{
                        width: '100%',
                        '& .MuiSlider-rail': {
                          background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
                          opacity: 0.3
                        },
                        '& .MuiSlider-track': {
                          background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
                          border: 'none'
                        },
                        '& .MuiSlider-thumb': {
                          backgroundColor: '#4c51bf',
                          boxShadow: '0 0 0 8px rgba(76, 81, 191, 0.16)'
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                      Qualidade de saída (10-49% - Baixa | 50-74% - Média | 75-100% - Alta)
                    </Typography>
                  </Box>
                </Box>

                {/* Second Row: Unidade (25%) + Trecho de Captura (75%) */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, width: '100%', alignItems: 'center' }}>
                  <Box sx={{ width: '25%', minWidth: 0 }}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="timeUnit-label" sx={{
                        color: 'rgba(0, 0, 0, 0.6)',
                        '&.Mui-focused': {
                          color: '#5a3d9a'
                        }
                      }}>Unidade *</InputLabel>
                      <Select
                        labelId="timeUnit-label"
                        id="timeUnit"
                        name="timeUnit"
                        value={formData.timeUnit}
                        onChange={handleTimeUnitChange}
                        label="Unidade *"
                        variant="outlined"
                        sx={{
                          color: 'rgba(0, 0, 0, 0.6)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.6)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#5a3d9a'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#5a3d9a'
                          },
                          '&.Mui-focused': {
                            color: '#5a3d9a'
                          }
                        }}
                      >
                        <MenuItem value="seconds">Segundos</MenuItem>
                        <MenuItem value="milliseconds">Milissegundos</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ width: '75%', minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.6)', fontWeight: 'bold', mb: 1 }}>Trecho de Captura *</Typography>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                          Início: <strong>{formData.startTime}</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                          Fim: <strong>{formData.endTime}</strong>
                        </Typography>
                      </Box>
                      <Slider
                        value={[formData.startTime, formData.endTime]}
                        onChange={(e, newValue) => {
                          let [start, end] = newValue;

                          // Garantir que a distância mínima seja sempre 1
                          if (end - start < 1) {
                            // Determinar qual marcador foi movido
                            const startMoved = start !== formData.startTime;
                            const endMoved = end !== formData.endTime;

                            if (startMoved) {
                              // Se moveu o início, ajustar o fim
                              end = Math.min(start + 1, getMaxDuration());
                              // Se o fim chegou ao máximo, ajustar o início
                              if (end === getMaxDuration() && end - start < 1) {
                                start = end - 1;
                              }
                            } else if (endMoved) {
                              // Se moveu o fim, ajustar o início
                              start = Math.max(end - 1, 0);
                              // Se o início chegou ao mínimo, ajustar o fim
                              if (start === 0 && end - start < 1) {
                                end = start + 1;
                              }
                            }
                          }

                          // Garantir que nunca fiquem iguais
                          if (end === start) {
                            end = Math.min(start + 1, getMaxDuration());
                          }

                          handleInputChange({ target: { name: 'startTime', value: start.toString() } });
                          handleInputChange({ target: { name: 'endTime', value: end.toString() } });
                        }}
                        aria-labelledby="time-range-slider"
                        min={0}
                        max={getMaxDuration()}
                        valueLabelDisplay="auto"
                        disabled={isMultipleIntervals(formData.interval)}
                        disableSwap
                        size="medium"
                        sx={{
                          width: '100%',
                          '& .MuiSlider-rail': {
                            background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
                            opacity: 0.3
                          },
                          '& .MuiSlider-track': {
                            background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
                            border: 'none'
                          },
                          '& .MuiSlider-thumb': {
                            backgroundColor: '#4c51bf',
                            boxShadow: '0 0 0 8px rgba(76, 81, 191, 0.16)'
                          }
                        }}
                      />
                      {isMultipleIntervals(formData.interval) && (
                        <Typography variant="caption" color="text.secondary" sx={{ color: 'rgba(0, 0, 0, 0.6)', mt: 0.5, display: 'block' }}>
                          Bloqueado: múltiplos intervalos definidos
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Third Row: Intervalo */}
                <Box sx={{ mb: 0 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Intervalo *"
                    id="interval"
                    name="interval"
                    value={formData.interval}
                    onChange={handleInputChange}
                    error={!!validationErrors.interval}
                    helperText={
                      validationErrors.interval ? (
                        validationErrors.interval
                      ) : (
                        <>
                          Único valor: captura recorrente (Ex: 10). Valores separados por vírgula: momentos específicos (Ex: 10,21,33)
                        </>
                      )
                    }
                    placeholder="Ex: 5 ou 10,20,30,40"
                    variant="outlined"
                    slotProps={{
                      inputLabel: {
                        sx: {
                          color: 'rgba(0, 0, 0, 0.6)',
                          '&.Mui-focused': {
                            color: '#5a3d9a'
                          }
                        }
                      }
                    }}
                    sx={{
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(0, 0, 0, 0.6)',
                        opacity: 0.6
                      },
                      '& .MuiInputBase-input': {
                        color: 'rgba(0, 0, 0, 0.6)'
                      },
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: '#5a3d9a'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#5a3d9a'
                        },
                        '&.Mui-focused input': {
                          color: '#5a3d9a'
                        }
                      }
                    }}
                  />
                </Box>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
        <Box sx={{ flex: 1 }}>
          {!uploading && validationErrors.interval && (
            <Alert severity="error" sx={{ m: 0, fontSize: '0.75rem', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
              {validationErrors.interval}
            </Alert>
          )}
          {!uploading && validationErrors.maxImages && (
            <Alert severity="error" sx={{ m: 0, fontWeight: 'bold', fontSize: '0.75rem', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
              {validationErrors.maxImages}
            </Alert>
          )}
          {!uploading && validationErrors.startTime && (
            <Alert severity="error" sx={{ m: 0, fontSize: '0.75rem', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
              {validationErrors.startTime}
            </Alert>
          )}
          {!uploading && validationErrors.endTime && (
            <Alert severity="error" sx={{ m: 0, fontSize: '0.75rem', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
              {validationErrors.endTime}
            </Alert>
          )}
          {!uploading && calculatePreview() && !validationErrors.interval && !validationErrors.maxImages && (
            <Alert severity="success" sx={{ m: 0, fontSize: '0.75rem', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
              {calculatePreview()}
            </Alert>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleCancelUpload}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isFormValid() || uploading}
            onClick={handleSubmit}
            startIcon={<CloudUploadIcon />}
            sx={{
              background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
              color: 'white',
              fontWeight: 600,
              px: 3,
              py: 1,
              boxShadow: '0 4px 15px rgba(76, 81, 191, 0.3)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #4c51bf 0%, #5a3d9a 100%)',
                opacity: 0.6,
                color: 'white'
              }
            }}
          >
            {uploading ? 'Enviando...' : 'Enviar Vídeo'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

UploadModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export default UploadModal;
