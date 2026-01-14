import React, { useState, useRef, useEffect } from 'react';
import { videoAPI, uploadToS3 } from '../../services/api';
import './Dashboard.css';

const UploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  
  // Video metadata
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoExtension, setVideoExtension] = useState('');
  
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
      
      // Set initial endTime based on duration
      const maxDuration = formData.timeUnit === 'milliseconds' ? 
        Math.floor(video.duration * 1000) : 
        Math.floor(video.duration);
      
      setFormData(prev => ({
        ...prev,
        endTime: maxDuration
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

  const handleFileSelect = (selectedFile) => {
    setError('');
    
    // Validate file type
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (!ALLOWED_FORMATS.includes(extension)) {
      setError(`Formato não suportado. Permitidos: ${ALLOWED_FORMATS.join(', ')}`);
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setFile(selectedFile);
    setVideoExtension(extension);
    
    // Set initial file name (without extension)
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setFormData(prev => ({
      ...prev,
      fileName: nameWithoutExt
    }));
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

  const validateForm = async () => {
    const errors = {};
    
    if (!file) {
      errors.file = 'Selecione um arquivo';
    }
    
    if (!formData.fileName.trim()) {
      errors.fileName = 'Nome do arquivo é obrigatório';
    } else {
      // Check if file name already exists
      const exists = await videoAPI.checkVideoExists(formData.fileName);
      if (exists) {
        errors.fileName = 'Já existe um arquivo com este nome. Escolha outro nome.';
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Step 1: Get presigned URL
      const { uploadUrl, videoId } = await videoAPI.getUploadUrl(
        `${formData.fileName}.${videoExtension}`,
        file.type
      );
      
      // Step 2: Upload file to S3
      await uploadToS3(uploadUrl, file, (progress) => {
        setUploadProgress(progress);
      });
      
      // Step 3: Send metadata to API Gateway
      const videoMetadata = {
        id: videoId,
        fileName: `${formData.fileName}.${videoExtension}`,
        fileSize: file.size,
        duration: videoDuration,
        uploadDate: new Date().toISOString(),
        status: 'pending',
        timeUnit: formData.timeUnit,
        startTime: parseFloat(formData.startTime),
        endTime: parseFloat(formData.endTime),
        interval: formData.interval,
        quality: formData.quality,
        retries: 0,
        extension: videoExtension
      };
      
      await videoAPI.createVideo(videoMetadata);
      
      // Success!
      onSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const isFormValid = () => {
    return file && 
           formData.fileName.trim() && 
           formData.interval.trim() &&
           Object.keys(validationErrors).length === 0;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Upload Novo Vídeo</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
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
            ) : (
              <>
                <div className="dropzone-icon">✓</div>
                <p className="dropzone-text file-selected">{file.name}</p>
                <p className="dropzone-hint">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
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
                
                <div className="form-group">
                  <label htmlFor="fileName">Nome do Arquivo *</label>
                  <input
                    type="text"
                    id="fileName"
                    name="fileName"
                    value={formData.fileName}
                    onChange={handleInputChange}
                    className={validationErrors.fileName ? 'error' : ''}
                    placeholder="nome-do-arquivo"
                  />
                  {validationErrors.fileName && (
                    <div className="field-error">{validationErrors.fileName}</div>
                  )}
                </div>

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
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
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
              onClick={onClose}
              disabled={uploading}
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
      </div>
    </div>
  );
};

export default UploadModal;
