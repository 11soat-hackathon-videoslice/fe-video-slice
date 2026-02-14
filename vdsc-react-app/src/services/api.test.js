// Mock axios ANTES de qualquer import
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  const axiosMock = {
    create: jest.fn(() => mockAxiosInstance),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    isCancel: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };

  return {
    __esModule: true,
    default: axiosMock
  };
});

import axios from 'axios';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { videoAPI, uploadToS3 } from './api';

// Reset mocks
beforeEach(() => {
  jest.clearAllMocks();

  // Setup default mocks
  getCurrentUser.mockResolvedValue({ userId: 'test-user-id' });
  fetchAuthSession.mockResolvedValue({
    tokens: {
      idToken: {
        toString: () => 'mock-token-12345'
      }
    }
  });
});

describe('API Service', () => {
  describe('videoAPI.getVideos', () => {
    it('deve buscar vídeos do usuário atual', async () => {
      const mockVideos = [
        { videoId: '1', fileName: 'video1.mp4', status: 'FINISHED' },
        { videoId: '2', fileName: 'video2.mp4', status: 'PROCESSING' }
      ];

      axios.get.mockResolvedValue({
        status: 200,
        data: { Items: mockVideos }
      });

      const result = await videoAPI.getVideos();

      expect(getCurrentUser).toHaveBeenCalled();
      expect(fetchAuthSession).toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('deve retornar array vazio quando não há vídeos', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: { Items: [] }
      });

      const result = await videoAPI.getVideos();

      expect(result).toEqual([]);
    });

    it('deve lidar com resposta direta em array', async () => {
      const mockVideos = [
        { videoId: '1', fileName: 'video1.mp4' }
      ];

      axios.get.mockResolvedValue({
        status: 200,
        data: mockVideos
      });

      const result = await videoAPI.getVideos();

      expect(result).toHaveLength(1);
    });

    it('deve lidar com formato items minúsculo', async () => {
      const mockVideos = [
        { videoId: '1', fileName: 'video1.mp4' }
      ];

      axios.get.mockResolvedValue({
        status: 200,
        data: { items: mockVideos }
      });

      const result = await videoAPI.getVideos();

      expect(result).toHaveLength(1);
    });

    it('deve lançar erro quando status é 403', async () => {
      axios.get.mockResolvedValue({
        status: 403,
        data: {}
      });

      await expect(videoAPI.getVideos()).rejects.toThrow('Acesso negado');
    });

    it('deve lançar erro quando status é >= 400', async () => {
      axios.get.mockResolvedValue({
        status: 404,
        data: {}
      });

      await expect(videoAPI.getVideos()).rejects.toThrow('Erro na API');
    });

    it('deve lançar erro com contexto quando response é 403', async () => {
      axios.get.mockRejectedValue({
        response: { status: 403 }
      });

      await expect(videoAPI.getVideos()).rejects.toThrow('Acesso negado');
    });
  });

  describe('videoAPI.getUploadUrl', () => {
    it('deve obter URL de upload', async () => {
      axios.post.mockResolvedValue({
        data: {
          url: 'https://s3.amazonaws.com/bucket/file.mp4',
          FileName: 'file.mp4',
          s3Key: 'videos/file.mp4',
          expiresIn: 900,
          action: 'upload',
          method: 'PUT'
        }
      });

      const result = await videoAPI.getUploadUrl('test.mp4');

      expect(axios.post).toHaveBeenCalled();
      expect(result.uploadUrl).toBe('https://s3.amazonaws.com/bucket/file.mp4');
      expect(result.fileName).toBe('file.mp4');
      expect(result.s3Key).toBe('videos/file.mp4');
    });

    it('deve lançar erro quando falha', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      await expect(videoAPI.getUploadUrl('test.mp4')).rejects.toThrow('Network error');
    });
  });

  describe('videoAPI.uploadVideoMetadata', () => {
    it('deve enviar metadados do vídeo', async () => {
      const metadata = {
        videoId: 'abc123',
        fileName: 'test',
        status: 'UPLOADED'
      };

      axios.post.mockResolvedValue({
        data: { success: true }
      });

      const result = await videoAPI.uploadVideoMetadata(metadata);

      expect(axios.post).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('deve lançar erro quando falha', async () => {
      axios.post.mockRejectedValue(new Error('Upload failed'));

      await expect(videoAPI.uploadVideoMetadata({})).rejects.toThrow('Upload failed');
    });
  });

  describe('videoAPI.downloadVideo', () => {
    beforeEach(() => {
      // Mock DOM elements
      document.body.innerHTML = '';
      global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
      global.URL.revokeObjectURL = jest.fn();
    });

    it('deve fazer download do vídeo', async () => {
      axios.post.mockResolvedValue({
        data: { url: 'https://s3.amazonaws.com/download/file.zip' }
      });

      axios.get.mockResolvedValue({
        data: new Blob(['file content'])
      });

      const result = await videoAPI.downloadVideo('myVideo.zip');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('myVideo.zip');
    });

    it('deve lançar erro quando URL não está disponível', async () => {
      axios.post.mockResolvedValue({
        data: {}
      });

      await expect(videoAPI.downloadVideo('myVideo.zip')).rejects.toThrow('URL de download não obtida');
    });
  });

  describe('uploadToS3', () => {
    it('deve fazer upload para S3', async () => {
      axios.put.mockResolvedValue({ status: 200 });

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const onProgress = jest.fn();

      await uploadToS3('https://s3.amazonaws.com/upload', file, onProgress);

      expect(axios.put).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/upload',
        file,
        expect.objectContaining({
          headers: { 'Content-Type': 'video/mp4' }
        })
      );
    });

    it('deve chamar callback de progresso', async () => {
      axios.put.mockImplementation((url, file, config) => {
        if (config.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 });
        }
        return Promise.resolve({ status: 200 });
      });

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const onProgress = jest.fn();

      await uploadToS3('https://s3.amazonaws.com/upload', file, onProgress);

      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('deve lançar erro de cancelamento', async () => {
      axios.put.mockRejectedValue({ name: 'CanceledError' });
      axios.isCancel.mockReturnValue(true);

      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

      await expect(uploadToS3('https://s3.amazonaws.com/upload', file, jest.fn()))
        .rejects.toThrow('Upload cancelado');
    });
  });

  describe('parseDynamoDBItem', () => {
    it('deve parsear item já em formato JavaScript', async () => {
      const mockVideo = {
        videoId: '1',
        fileName: 'test.mp4',
        userId: 'user123'
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: { Items: [mockVideo] }
      });

      const result = await videoAPI.getVideos();

      expect(result[0].id).toBe('1');
      expect(result[0].fileName).toBe('test.mp4');
    });

    it('deve parsear formato DynamoDB com tipos S, N, BOOL', async () => {
      const mockDynamoItem = {
        videoId: { S: 'video-123' },
        fileName: { S: 'test.mp4' },
        fileSize: { N: '1024' },
        status: { S: 'FINISHED' }
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: { Items: [mockDynamoItem] }
      });

      const result = await videoAPI.getVideos();

      expect(result[0].id).toBe('video-123');
      expect(result[0].fileName).toBe('test.mp4');
    });

    it('deve parsear listas DynamoDB', async () => {
      const mockDynamoItem = {
        videoId: { S: 'video-123' },
        fileName: { S: 'test.mp4' },
        timeInterval: { L: [{ S: '10' }, { S: '20' }] },
        logs: { L: [{ M: { timestamp: { S: '2026-01-01T00:00:00Z' }, info: { S: 'test' } } }] }
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: { Items: [mockDynamoItem] }
      });

      const result = await videoAPI.getVideos();

      expect(result[0].id).toBe('video-123');
    });
  });

  describe('mapVideoFromAPI', () => {
    it('deve mapear campos corretamente', async () => {
      const mockVideo = {
        videoId: 'vid-123',
        fileName: 'my-video',
        created: '2026-01-15T10:00:00Z',
        fileSize: 1024000,
        totalTime: 120,
        status: 'FINISHED',
        unitTime: 's',
        startTime: 0,
        endTime: 120,
        timeInterval: ['10', '20'],
        quality: 'high',
        maxRetry: 3,
        retries: 0,
        logs: [],
        extensionFile: 'mp4'
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: { Items: [mockVideo] }
      });

      const result = await videoAPI.getVideos();

      expect(result[0]).toMatchObject({
        id: 'vid-123',
        fileName: 'my-video',
        uploadDate: '2026-01-15T10:00:00Z',
        fileSize: 1024000,
        duration: 120,
        status: 'FINISHED',
        timeUnit: 's',
        startTime: 0,
        endTime: 120,
        quality: 'high',
        maxRetries: 3,
        retries: 0,
        extensionFile: 'mp4'
      });
    });

    it('deve usar campos alternativos quando primários não existem', async () => {
      const mockVideo = {
        id: 'vid-123',
        uploadDate: '2026-01-15T10:00:00Z',
        duration: 120,
        timeUnit: 's',
        extension: 'mp4'
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: { Items: [mockVideo] }
      });

      const result = await videoAPI.getVideos();

      expect(result[0].id).toBe('vid-123');
      expect(result[0].uploadDate).toBe('2026-01-15T10:00:00Z');
      expect(result[0].duration).toBe(120);
    });
  });
});
