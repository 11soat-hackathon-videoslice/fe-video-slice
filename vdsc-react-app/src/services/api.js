import axios from 'axios';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { apiConfig } from '../config/aws-config';

// Create axios instance
const api = axios.create({
  baseURL: apiConfig.baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching auth session:', error);
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Helper function to get current user ID
const getCurrentUserId = async () => {
  try {
    const user = await getCurrentUser();
    return user.userId;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

// Helper function to parse DynamoDB format to JavaScript
const parseDynamoDBItem = (item) => {
  if (!item) return null;
  
  // Check if any property has DynamoDB type descriptors (S, N, BOOL, L, M)
  const hasDynamoDBFormat = Object.values(item).some(value =>
    value && typeof value === 'object' &&
    (value.S !== undefined || value.N !== undefined || value.BOOL !== undefined ||
     value.L !== undefined || value.M !== undefined || value.NULL !== undefined)
  );

  // If no DynamoDB format detected, return as is
  if (!hasDynamoDBFormat) {
    return item;
  }
  
  // Otherwise, parse DynamoDB format
  const parsed = {};
  
  for (const [key, value] of Object.entries(item)) {
    if (value.S !== undefined) {
      // String
      parsed[key] = value.S;
    } else if (value.N !== undefined) {
      // Number
      parsed[key] = parseFloat(value.N);
    } else if (value.BOOL !== undefined) {
      // Boolean
      parsed[key] = value.BOOL;
    } else if (value.L !== undefined) {
      // List
      parsed[key] = value.L.map(item => {
        if (item.S !== undefined) return item.S;
        if (item.N !== undefined) return parseFloat(item.N);
        if (item.M !== undefined) return parseDynamoDBItem(item.M);
        return item;
      });
    } else if (value.M !== undefined) {
      // Map
      parsed[key] = parseDynamoDBItem(value.M);
    } else if (value.NULL !== undefined) {
      // Null
      parsed[key] = null;
    }
  }
  
  return parsed;
};

// Helper function to map API response to table format
const mapVideoFromAPI = (apiVideo) => {
  // Parse DynamoDB format if needed (function now handles both formats)
  const video = parseDynamoDBItem(apiVideo);
  
  console.log('Original video item:', apiVideo);
  console.log('Parsed video:', video);
  
  return {
    id: video.videoId || video.id,
    fileName: video.fileName,
    uploadDate: video.created || video.uploadDate,
    fileSize: video.fileSize || null,
    duration: video.totalTime || video.duration,
    status: video.status,
    timeUnit: video.unitTime || video.timeUnit,
    startTime: video.startTime,
    endTime: video.endTime,
    interval: Array.isArray(video.timeInterval) 
      ? video.timeInterval.join(', ') 
      : video.timeInterval,
    quality: video.quality,
    maxRetries: video.maxRetry || video.maxRetries,
    retries: video.retries || 0,
    logs: video.logs || [],
    extensionFile: video.extensionFile || video.extension
  };
};

// Video API endpoints
export const videoAPI = {
  // Get all videos for current user
  getVideos: async () => {
    try {
      const userId = await getCurrentUserId();
      console.log('Current user ID:', userId);
      
      const url = `${apiConfig.apiUrl}${apiConfig.apiListByUserId}/${userId}`;
      console.log('Fetching videos from:', url);
      
      const session = await fetchAuthSession();
      console.log('Session:', session);
      
      const token = session.tokens?.idToken?.toString();
      console.log('Token available:', !!token);
      console.log('Token (first 50 chars):', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Authorization header set');
      } else {
        console.warn('No token available for request');
      }
      
      console.log('Request headers:', headers);
      
      const response = await axios.get(url, { 
        headers,
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Videos response:', response.data);
      
      // Check for error status
      if (response.status === 403) {
        throw new Error('Acesso negado. Verifique suas permissões.');
      }
      
      if (response.status >= 400) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      // Parse DynamoDB response format
      let items = [];
      
      if (response.data) {
        // Check if response has Items array (DynamoDB format)
        if (response.data.Items && Array.isArray(response.data.Items)) {
          items = response.data.Items;
          console.log('Found Items in DynamoDB format:', items.length);
        }
        // Check if response has items array (standard format)
        else if (response.data.items && Array.isArray(response.data.items)) {
          items = response.data.items;
          console.log('Found items in standard format:', items.length);
        }
        // Check if response is directly an array
        else if (Array.isArray(response.data)) {
          items = response.data;
          console.log('Response is direct array:', items.length);
        }
      }
      
      if (items.length === 0) {
        console.log('No videos found');
        return [];
      }
      
      // Map videos to table format
      const mappedVideos = items.map(mapVideoFromAPI);
      console.log('Mapped videos:', mappedVideos);
      return mappedVideos;
    } catch (error) {
      console.error('Error fetching videos:', error);
      console.error('Error message:', error.message);
      console.error('Error response status:', error.response?.status);
      console.error('Error response headers:', error.response?.headers);
      console.error('Error response data:', error.response?.data);
      console.error('Error config URL:', error.config?.url);
      console.error('Error config headers:', error.config?.headers);
      
      // Re-throw with more context
      if (error.response?.status === 403) {
        throw new Error('Acesso negado. Verifique se você está autenticado e tem permissão.');
      }
      
      throw error;
    }
  },

  // Get video by ID
  getVideoById: async (id) => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },

  // Create new video metadata
  createVideo: async (videoData) => {
    const response = await api.post('/videos', videoData);
    return response.data;
  },

  // Update video metadata
  updateVideo: async (id, videoData) => {
    const response = await api.put(`/videos/${id}`, videoData);
    return response.data;
  },

  // Delete video
  deleteVideo: async (id) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },

  // Get presigned URL for upload
  getUploadUrl: async (fileName) => {
    try {
      const url = `${apiConfig.apiUrl}${apiConfig.apiUploadUrl}/${encodeURIComponent(fileName)}`;
      console.log('Getting upload URL from:', url);
      
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(url, {}, { headers });
      
      console.log('Upload URL response:', response.data);
      
      // Response is already in JSON format with url, FileName, expiresIn, s3Key, action, method
      return {
        uploadUrl: response.data.url,
        fileName: response.data.FileName,
        s3Key: response.data.s3Key,
        expiresIn: (response.data.expiresIn)/60 + " minutos",
        action: response.data.action,
        method: response.data.method
      };
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  },

  // Get presigned URL for download
  getDownloadUrl: async (id) => {
    const response = await api.get(`/videos/${id}/download-url`);
    return response.data;
  },

  // Check if video name exists
  checkVideoExists: async (fileName) => {
    try {
      const response = await api.get(`/videos/check/${encodeURIComponent(fileName)}`);
      return response.data.exists;
    } catch (error) {
      return false;
    }
  },

  // Upload video metadata after S3 upload
  uploadVideoMetadata: async (metadata) => {
    try {
      const url = `${apiConfig.apiUrl}${apiConfig.apiUploadMetadata}`;
      console.log('Uploading video metadata to:', url);
      console.log('Metadata:', metadata);
      
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(url, metadata, { headers });
      
      console.log('Metadata upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error uploading metadata:', error);
      throw error;
    }
  },

  // Download video using videoId
  downloadVideo: async (videoId) => {
    try {
      const fileName = `${videoId}.zip`;
      const url = `${apiConfig.apiUrl}${apiConfig.apiDownloadUrl}/${encodeURIComponent(fileName)}`;
      console.log('Getting download URL from:', url);

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(url, {}, { headers });

      console.log('Download URL response:', response.data);

      const downloadUrl = response.data.url;

      if (!downloadUrl) {
        throw new Error('URL de download não obtida');
      }

      // Fazer o download automaticamente
      const downloadResponse = await axios.get(downloadUrl, {
        responseType: 'blob'
      });

      // Criar um blob e fazer o download
      const blobUrl = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      console.log(`Download do arquivo ${fileName} iniciado`);
      return { success: true, fileName };
    } catch (error) {
      console.error('Erro ao fazer download do vídeo:', error);
      throw error;
    }
  }
};

// Upload file to S3 using presigned URL
export const uploadToS3 = async (presignedUrl, file, onProgress, signal) => {
  return axios.put(presignedUrl, file, {
    headers: {
      'Content-Type': file.type
    },
    signal: signal,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  }).catch(error => {
    if (axios.isCancel(error) || error.name === 'CanceledError') {
      throw new Error('Upload cancelado');
    }
    throw error;
  });
};

export default api;
