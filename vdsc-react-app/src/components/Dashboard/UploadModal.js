import React, { useState, useRef, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { videoAPI, uploadToS3 } from '../../services/api';
import './Dashboard.css';

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
    quality: 'high'
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Allowed video formats
  const ALLOWED_FORMATS = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  useEffect(() => {
    if (file) {
      loadVideoMetadata(file);
    }
  }, [file]);

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

  const loadVideoMetadata = (file) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      setVideoDuration(video.duration);
      
      // Get video resolution
      const width = video.videoWidth;
      const height = video.videoHeight;
      setVideoResolution({ width, height });
      
      console.log('Video resolution:', width, 'x', height);
      
      // Set initial endTime based on duration
      const maxDuration = formData.timeUnit === 'milliseconds' ? 
        Math.floor(video.duration * 1000) : 
        Math.floor(video.duration);
      
      // Determine initial quality based on resolution
      let initialQuality = 'low';
      if (height >= 1080) {
        initialQuality = 'ultra';
        console.log('Video is 1080p or higher - all qualities available');
      } else if (height >= 720) {
        initialQuality = 'high';
        console.log('Video is 720p - ultra, high and lower qualities available');
      } else if (height >= 480) {
        initialQuality = 'medium';
        console.log('Video is 480p - medium and low available');
      } else {
        console.log('Video is below 480p - only low available');
      }
      
      setFormData(prev => ({
        ...prev,
        endTime: maxDuration,
        quality: initialQuality
      }));
    };

    video.src = URL.createObjectURL(file);
  };

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
      const uploadFileName = `${newVideoId}.${extensionFile}`;
      console.log('Requesting upload URL for:', uploadFileName);
      
      const uploadData = await videoAPI.getUploadUrl(uploadFileName);
      console.log('Upload data received:', uploadData);
      
      setUploadInfo({
        uploadUrl: uploadData.uploadUrl,
        fileName: uploadData.fileName,
        s3Key: uploadData.s3Key,
        expiresIn: uploadData.expiresIn
      });
    } catch (err) {
      console.error('Error getting upload URL:', err);
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
  };

  const getMaxDuration = () => {
    return formData.timeUnit === 'milliseconds' ? 
      Math.floor(videoDuration * 1000) : 
      Math.floor(videoDuration);
  };

  const isQualityAvailable = (quality) => {
    const height = videoResolution.height;
    switch (quality) {
      case 'ultra':
        // Ultra (1080p): requires 1080p or higher
        return height >= 1080;
      case 'high':
        // Alta (720p): requires 720p or higher
        return height >= 720;
      case 'medium':
        // Média (480p): requires 480p or higher
        return height >= 480;
      case 'low':
        // Baixa (360p): always available
        return true;
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
      console.log('Uploading file to S3 with name:', `${videoId}.${videoExtension}`);
      await uploadToS3(uploadInfo.uploadUrl, file, (progress) => {
        setUploadProgress(progress);
      }, uploadAbortController.current.signal);
      
      // Step 2: Get current user ID
      const user = await getCurrentUser();
      const userId = user.userId;
      
      // Map quality to API format
      const qualityMap = {
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
      console.log('Sending metadata to API...');

      // Create upload log entry
      const uploadLog = {
        timestamp: timestamp,
        info: `Upload realizado com sucesso`
      };

      const videoMetadata = {
        videoId: videoId,
        fileName: formData.fileName,
        extensionFile: videoExtension,
        status: 'UPLOADED',
        created: timestamp,
        userId: userId,
        totalTime: Math.floor(videoDuration),
        unitTime: formData.timeUnit === 'seconds' ? 's' : 'ms',
        startTime: parseFloat(formData.startTime),
        endTime: parseFloat(formData.endTime),
        timeInterval: timeIntervalArray,
        maxRetry: parseInt(process.env.REACT_APP_MAX_RETRY || '3'),
        retries: 0,
        quality: qualityMap[formData.quality] || 'medium',
        logs: [uploadLog]
      };
      
      await videoAPI.uploadVideoMetadata(videoMetadata);
      
      // Success!
      onSuccess();
    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'Upload cancelado') {
        console.log('Upload was cancelled by user');
        return;
      }
      console.error('Upload error:', err);
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

    // Check validation errors
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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Upload Novo Vídeo</h2>
          <button className="modal-close" onClick={uploading ? handleCancelUpload : onClose}>×</button>
        </div>
        
        {cancelMessage ? (
          <div className="cancel-message-container">
            <div className="cancel-message">{cancelMessage}</div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="upload-form">
          {/* Drag and Drop Area */}
          <div 
            className={`dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
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
              <>
                <div className="dropzone-icon">📁</div>
                <p className="dropzone-text">
                  Arraste um vídeo aqui ou clique para selecionar
                </p>
                <p className="dropzone-hint">
                  Formatos aceitos: {ALLOWED_FORMATS.join(', ')} | Máx: 500MB
                </p>
              </>
            ) : preparingUpload ? (
              <>
                <div className="dropzone-icon">⏳</div>
                <p className="dropzone-text">Preparando upload...</p>
                <p className="dropzone-hint">Obtendo URL de upload</p>
              </>
            ) : (
              <>
                <div className="dropzone-icon">✓</div>
                <p className="dropzone-text file-selected">{file.name}</p>
                <p className="dropzone-hint">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                  {uploadInfo && uploadInfo.expiresIn && (
                    <span style={{ marginLeft: '8px', color: '#667eea' }}>
                      • Link expira em {uploadInfo.expiresIn}
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
          
          {validationErrors.file && (
            <div className="field-error">{validationErrors.file}</div>
          )}

          {file && (
            <>
              {/* Non-editable Properties */}
              <div className="form-section">
                <h3>Propriedades do Arquivo</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>ID do Vídeo:</label>
                    <span className="video-id-display">{videoId}</span>
                  </div>
                  <div className="info-item">
                    <label>Nome Original:</label>
                    <span>{formData.fileName}</span>
                  </div>
                  <div className="info-item">
                    <label>Extensão:</label>
                    <span>{videoExtension}</span>
                  </div>
                  <div className="info-item">
                    <label>Duração:</label>
                    <span>
                      {formData.timeUnit === 'milliseconds' 
                        ? `${Math.floor(videoDuration * 1000)} ms`
                        : `${Math.floor(videoDuration)} s`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Properties */}
              <div className="form-section">
                <h3>Configurações de Processamento</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="timeUnit">Unidade de Tempo *</label>
                    <select
                      id="timeUnit"
                      name="timeUnit"
                      value={formData.timeUnit}
                      onChange={handleTimeUnitChange}
                    >
                      <option value="seconds">Segundos</option>
                      <option value="milliseconds">Milissegundos</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="quality">Qualidade</label>
                    <select
                      id="quality"
                      name="quality"
                      value={formData.quality}
                      onChange={handleInputChange}
                    >
                      <option value="ultra" disabled={!isQualityAvailable('ultra')}>
                        Ultra - 1080p {!isQualityAvailable('ultra') && '(Indisponível)'}
                      </option>
                      <option value="high" disabled={!isQualityAvailable('high')}>
                        Alta - 720p {!isQualityAvailable('high') && '(Indisponível)'}
                      </option>
                      <option value="medium" disabled={!isQualityAvailable('medium')}>
                        Média - 480p {!isQualityAvailable('medium') && '(Indisponível)'}
                      </option>
                      <option value="low" disabled={!isQualityAvailable('low')}>
                        Baixa - 360p
                      </option>
                    </select>
                    {videoResolution.height > 0 && (
                      <small className="help-text">
                        Resolução do vídeo: {videoResolution.width}x{videoResolution.height}
                      </small>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="startTime">Tempo Inicial *</label>
                    <input
                      type="number"
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      min="0"
                      max={getMaxDuration()}
                      disabled={isMultipleIntervals(formData.interval)}
                      className={validationErrors.startTime ? 'error' : ''}
                    />
                    {isMultipleIntervals(formData.interval) && (
                      <small className="help-text">Bloqueado: múltiplos intervalos definidos</small>
                    )}
                    {validationErrors.startTime && (
                      <div className="field-error">{validationErrors.startTime}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="endTime">Tempo Final *</label>
                    <input
                      type="number"
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      min="0"
                      max={getMaxDuration()}
                      disabled={isMultipleIntervals(formData.interval)}
                      className={validationErrors.endTime ? 'error' : ''}
                    />
                    {isMultipleIntervals(formData.interval) && (
                      <small className="help-text">Bloqueado: múltiplos intervalos definidos</small>
                    )}
                    {validationErrors.endTime && (
                      <div className="field-error">{validationErrors.endTime}</div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="interval">Intervalo *</label>
                  <input
                    type="text"
                    id="interval"
                    name="interval"
                    value={formData.interval}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={validationErrors.interval ? 'error' : ''}
                    placeholder="Ex: 5 ou 10,20,30,40"
                  />
                  <small className="help-text">
                    Preencher com único valor captura recorrente entre tempo inicial e tempo final. Ex: 10<br />
                    Preencher com valores separados por vírgula para capturar momentos específicos. Ex: 10,21,22,33,55
                  </small>
                  {validationErrors.interval && (
                    <div className="field-error">{validationErrors.interval}</div>
                  )}
                  {calculatePreview() && !validationErrors.interval && (
                    <div className="preview-message" style={{
                      backgroundColor: '#d4edda',
                      color: '#155724',
                      padding: '10px 15px',
                      borderRadius: '4px',
                      marginTop: '8px',
                      border: '1px solid #c3e6cb'
                    }}>
                      {calculatePreview()}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="progress-text">Enviando: {uploadProgress}%</p>
            </div>
          )}

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={handleCancelUpload}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={!isFormValid() || uploading}
            >
              {uploading ? 'Enviando...' : 'Enviar Vídeo'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
