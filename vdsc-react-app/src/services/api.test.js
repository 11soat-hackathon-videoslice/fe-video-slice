import axios from 'axios';
import { videoAPI, uploadToS3 } from './api';

// Mock axios
jest.mock('axios');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('videoAPI.getVideos', () => {
    it('deve buscar lista de vídeos', async () => {
      const mockVideos = [
        { id: 1, fileName: 'video1.mp4', status: 'completed' },
        { id: 2, fileName: 'video2.mp4', status: 'processing' }
      ];

      axios.get.mockResolvedValue({ data: mockVideos });

      const result = await videoAPI.getVideos();

      expect(axios.get).toHaveBeenCalled();
      expect(result).toEqual(mockVideos);
    });

    it('deve lidar com erro ao buscar vídeos', async () => {
      const errorMessage = 'Network error';
      axios.get.mockRejectedValue(new Error(errorMessage));

      await expect(videoAPI.getVideos()).rejects.toThrow(errorMessage);
    });

    it('deve enviar header de autenticação', async () => {
      axios.get.mockResolvedValue({ data: [] });

      await videoAPI.getVideos();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
    });
  });

  describe('videoAPI.getUploadUrl', () => {
    it('deve obter URL de upload', async () => {
      const mockResponse = {
        uploadUrl: 'https://s3.amazonaws.com/test',
        fileName: 'test_123.mp4',
        s3Key: 'videos/test_123.mp4',
        expiresIn: 3600
      };

      axios.post.mockResolvedValue({ data: mockResponse });

      const result = await videoAPI.getUploadUrl('test.mp4');

      expect(axios.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('deve enviar nome do arquivo', async () => {
      axios.post.mockResolvedValue({ data: {} });

      await videoAPI.getUploadUrl('myfile.mp4');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          fileName: 'myfile.mp4'
        }),
        expect.any(Object)
      );
    });

    it('deve lidar com erro ao obter URL', async () => {
      const errorMessage = 'Server error';
      axios.post.mockRejectedValue(new Error(errorMessage));

      await expect(videoAPI.getUploadUrl('test.mp4')).rejects.toThrow(errorMessage);
    });
  });

  describe('videoAPI.uploadVideoMetadata', () => {
    it('deve enviar metadados do vídeo', async () => {
      const metadata = {
        id: 1,
        fileName: 'test.mp4',
        quality: 'high',
        intervals: [10, 20, 30]
      };

      axios.post.mockResolvedValue({ data: { success: true } });

      const result = await videoAPI.uploadVideoMetadata(metadata);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        metadata,
        expect.any(Object)
      );
      expect(result).toEqual({ success: true });
    });

    it('deve validar metadados obrigatórios', async () => {
      const incompleteMetadata = {
        fileName: 'test.mp4'
        // Faltam outros campos
      };

      axios.post.mockResolvedValue({ data: { success: true } });

      // A API deve aceitar, mas pode validar no backend
      await videoAPI.uploadVideoMetadata(incompleteMetadata);

      expect(axios.post).toHaveBeenCalled();
    });

    it('deve lidar com erro ao enviar metadados', async () => {
      const errorMessage = 'Validation error';
      axios.post.mockRejectedValue(new Error(errorMessage));

      await expect(videoAPI.uploadVideoMetadata({})).rejects.toThrow(errorMessage);
    });
  });

  describe('videoAPI.deleteVideo', () => {
    it('deve deletar vídeo', async () => {
      axios.delete.mockResolvedValue({ data: { success: true } });

      const result = await videoAPI.deleteVideo(1);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('1'),
        expect.any(Object)
      );
      expect(result).toEqual({ success: true });
    });

    it('deve enviar ID do vídeo correto', async () => {
      axios.delete.mockResolvedValue({ data: { success: true } });

      await videoAPI.deleteVideo(123);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('123'),
        expect.any(Object)
      );
    });

    it('deve lidar com erro ao deletar', async () => {
      const errorMessage = 'Video not found';
      axios.delete.mockRejectedValue(new Error(errorMessage));

      await expect(videoAPI.deleteVideo(999)).rejects.toThrow(errorMessage);
    });
  });

  describe('uploadToS3', () => {
    it('deve fazer upload de arquivo para S3', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const uploadUrl = 'https://s3.amazonaws.com/test';

      axios.put.mockResolvedValue({ status: 200 });

      const result = await uploadToS3(uploadUrl, file);

      expect(axios.put).toHaveBeenCalledWith(
        uploadUrl,
        file,
        expect.any(Object)
      );
      expect(result).toEqual({ status: 200 });
    });

    it('deve enviar tipo de conteúdo correto', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const uploadUrl = 'https://s3.amazonaws.com/test';

      axios.put.mockResolvedValue({ status: 200 });

      await uploadToS3(uploadUrl, file);

      expect(axios.put).toHaveBeenCalledWith(
        uploadUrl,
        file,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'video/mp4'
          })
        })
      );
    });

    it('deve fazer upload com progress callback', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const uploadUrl = 'https://s3.amazonaws.com/test';
      const onProgress = jest.fn();

      axios.put.mockResolvedValue({ status: 200 });

      await uploadToS3(uploadUrl, file, onProgress);

      expect(axios.put).toHaveBeenCalledWith(
        uploadUrl,
        file,
        expect.objectContaining({
          onUploadProgress: expect.any(Function)
        })
      );
    });

    it('deve lidar com erro no upload', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const uploadUrl = 'https://s3.amazonaws.com/test';
      const errorMessage = 'Upload failed';

      axios.put.mockRejectedValue(new Error(errorMessage));

      await expect(uploadToS3(uploadUrl, file)).rejects.toThrow(errorMessage);
    });

    it('deve chamar callback de progress', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const uploadUrl = 'https://s3.amazonaws.com/test';
      const onProgress = jest.fn();

      axios.put.mockImplementation((url, data, config) => {
        // Simula progresso do upload
        if (config.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 });
          config.onUploadProgress({ loaded: 100, total: 100 });
        }
        return Promise.resolve({ status: 200 });
      });

      await uploadToS3(uploadUrl, file, onProgress);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          loaded: expect.any(Number),
          total: expect.any(Number)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('deve tratar timeout de requisição', async () => {
      const error = new Error('timeout of 30000ms exceeded');
      axios.get.mockRejectedValue(error);

      await expect(videoAPI.getVideos()).rejects.toThrow();
    });

    it('deve tratar erro 401 Unauthorized', async () => {
      const error = new Error('401 Unauthorized');
      axios.get.mockRejectedValue(error);

      await expect(videoAPI.getVideos()).rejects.toThrow();
    });

    it('deve tratar erro 500 Server Error', async () => {
      const error = new Error('500 Internal Server Error');
      axios.post.mockRejectedValue(error);

      await expect(videoAPI.getUploadUrl('test.mp4')).rejects.toThrow();
    });

    it('deve tratar erro de network', async () => {
      const error = new Error('Network Error');
      axios.get.mockRejectedValue(error);

      await expect(videoAPI.getVideos()).rejects.toThrow('Network Error');
    });
  });

  describe('Headers and Configuration', () => {
    it('deve incluir Content-Type header', async () => {
      axios.post.mockResolvedValue({ data: {} });

      await videoAPI.uploadVideoMetadata({});

      const callConfig = axios.post.mock.calls[0][2];
      expect(callConfig.headers).toEqual(expect.objectContaining({
        'Content-Type': 'application/json'
      }));
    });

    it('deve incluir Authorization header quando disponível', async () => {
      axios.get.mockResolvedValue({ data: [] });

      await videoAPI.getVideos();

      const callConfig = axios.get.mock.calls[0][1];
      expect(callConfig.headers).toBeDefined();
    });

    it('deve usar timeout apropriado', async () => {
      axios.get.mockResolvedValue({ data: [] });

      await videoAPI.getVideos();

      const callConfig = axios.get.mock.calls[0][1];
      expect(callConfig.timeout).toBeDefined();
    });
  });
});
