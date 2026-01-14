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

// Helper function to map API response to table format
const mapVideoFromAPI = (apiVideo) => {
  return {
    id: apiVideo.id,
    fileName: apiVideo.fileName,
    uploadDate: apiVideo.created,
    fileSize: null, // Not provided in API response
    duration: apiVideo.totalTime,
    status: apiVideo.status,
    timeUnit: apiVideo.unitTime,
    startTime: apiVideo.startTime,
    endTime: apiVideo.endTime,
    interval: Array.isArray(apiVideo.timeInterval) 
      ? apiVideo.timeInterval.join(', ') 
      : apiVideo.timeInterval,
    quality: apiVideo.quality,
    maxRetries: apiVideo.maxRetry,
    retries: apiVideo.retries,
    logs: apiVideo.logs || []
  };
};

// Video API endpoints
export const videoAPI = {
  // Get all videos for current user
  getVideos: async () => {
    try {
      const userId = await getCurrentUserId();
      const url = `https://fj8aqi31jh.execute-api.us-east-1.amazonaws.com/prd/videos/list/${userId}`;
      console.log('Fetching videos from:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Videos response:', response.data);
      
      // Parse the response and map to table format
      if (response.data && response.data.items && Array.isArray(response.data.items)) {
        const mappedVideos = response.data.items.map(mapVideoFromAPI);
        console.log('Mapped videos:', mappedVideos);
        return mappedVideos;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching videos:', error);
      console.error('Error details:', error.response?.data);
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
  getUploadUrl: async (fileName, fileType) => {
    const response = await api.post('/videos/upload-url', {
      fileName,
      fileType
    });
    return response.data;
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
  }
};

// Upload file to S3 using presigned URL
export const uploadToS3 = async (presignedUrl, file, onProgress) => {
  return axios.put(presignedUrl, file, {
    headers: {
      'Content-Type': file.type
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });
};

export default api;
