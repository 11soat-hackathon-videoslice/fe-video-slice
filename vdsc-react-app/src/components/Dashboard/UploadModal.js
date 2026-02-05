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
    quality: 'medium'
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
        initialQuality = 'medium';
        console.log('Video is 1080p or higher - all qualities available');
      } else if (height >= 720) {
        initialQuality = 'medium';
        console.log('Video is 720p - medium and low available');
      } else {
        console.log('Video is below 720p - only low available');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
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
    if (height >= 1080) {
      // 1080p ou mais: todas as qualidades disponíveis
      return true;
    } else if (height >= 720) {
      // 720p: média e baixa
      return quality === 'medium' || quality === 'low';
    } else {
      // Abaixo de 720p: somente baixa
      return quality === 'low';
    }
  };

  const validateForm = async () => {
    const errors = {};
    
    if (!file) {
      errors.file = 'Selecione um arquivo';
    }
    
    const maxDuration = getMaxDuration();
    
    if (formData.startTime < 0) {
      errors.startTime = 'Tempo inicial não pode ser negativo';
    }
    
    if (formData.startTime >= maxDuration) {
      errors.startTime = 'Tempo inicial deve ser menor que a duração do vídeo';
    }
    
    if (formData.endTime <= formData.startTime) {
      errors.endTime = 'Tempo final deve ser maior que o tempo inicial';
    }
    
    if (formData.endTime > maxDuration) {
      errors.endTime = 'Tempo final não pode exceder a duração do vídeo';
    }
    
    if (!formData.interval.trim()) {
      errors.interval = 'Intervalo é obrigatório';
    } else {
      // Validate interval format
      const intervals = formData.interval.split(',').map(i => i.trim());
      const hasInvalidInterval = intervals.some(interval => {
        const num = parseFloat(interval);
        return isNaN(num) || num < 0;
      });
      
      if (hasInvalidInterval) {
        errors.interval = 'Intervalo deve conter apenas números positivos separados por vírgula';
      }
      
      // If multiple intervals, validate they are within range
      if (intervals.length > 1) {
        const hasOutOfRange = intervals.some(interval => {
          const num = parseFloat(interval);
          return num < formData.startTime || num > formData.endTime;
        });
        
        if (hasOutOfRange) {
          errors.interval = 'Todos os intervalos devem estar entre o tempo inicial e final';
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
        'high': 'high',
        'medium': 'medium',
        'low': 'low'
      };
      
      // Parse interval to array format
      const timeIntervalArray = formData.interval.split(',').map(i => i.trim());
      
      // Format timestamp as YYYY-MM-DD HH:mm:ss
      const now = new Date();
      const timestamp = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0') + ':' + 
        String(now.getSeconds()).padStart(2, '0');
      
      // Step 3: Send metadata to API Gateway
      console.log('Sending metadata to API...');
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
        quality: qualityMap[formData.quality] || 'medium'
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
    return file && 
           videoId && 
           uploadInfo &&
           uploadInfo.uploadUrl &&
           formData.interval.trim() &&
           Object.keys(validationErrors).length === 0 &&
           !preparingUpload;
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
                    <label>Duração Máxima:</label>
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
                      <option value="high" disabled={!isQualityAvailable('high')}>
                        Alta {!isQualityAvailable('high') && '(Indisponível)'}
                      </option>
                      <option value="medium" disabled={!isQualityAvailable('medium')}>
                        Média {!isQualityAvailable('medium') && '(Indisponível)'}
                      </option>
                      <option value="low">Baixa</option>
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
                      min="0"
                      max={getMaxDuration()}
                      className={validationErrors.startTime ? 'error' : ''}
                    />
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
                      min="0"
                      max={getMaxDuration()}
                      className={validationErrors.endTime ? 'error' : ''}
                    />
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
                    className={validationErrors.interval ? 'error' : ''}
                    placeholder="Ex: 5 ou 10,20,30,40"
                  />
                  <small className="help-text">
                    Valor único (ex: "5") para intervalo regular, ou valores separados por vírgula (ex: "10,20,30") para momentos específicos
                  </small>
                  {validationErrors.interval && (
                    <div className="field-error">{validationErrors.interval}</div>
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
