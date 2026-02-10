import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getCurrentUser } from 'aws-amplify/auth';
import UploadModal from './UploadModal';
import { videoAPI, uploadToS3 } from '../../services/api';

// Mock do api
jest.mock('../../services/api', () => ({
  videoAPI: {
    getUploadUrl: jest.fn(),
    uploadVideoMetadata: jest.fn(),
  },
  uploadToS3: jest.fn(),
}));

// Mock do aws-amplify/auth
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
}));

describe('UploadModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockVideoElement = null; // Limpar o mock de vídeo antes de cada teste
    getCurrentUser.mockResolvedValue({ userId: 'test-user-id' });
    videoAPI.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/test-bucket/test.mp4',
      fileName: 'abc123.mp4',
      s3Key: 'videos/abc123.mp4',
      expiresIn: '15 minutos'
    });
    videoAPI.uploadVideoMetadata.mockResolvedValue({ success: true });
    uploadToS3.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderUploadModal = () => {
    return render(<UploadModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
  };

  // Helper para criar arquivo mock com metadata de vídeo
  const createMockFile = (name = 'test.mp4', size = 1024 * 1024, type = 'video/mp4') => {
    const file = new File(['video content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  // Mock global do createElement
  let mockVideoElement = null;
  const originalCreateElement = HTMLDocument.prototype.createElement;

  beforeAll(() => {
    HTMLDocument.prototype.createElement = function(tagName) {
      if (tagName === 'video' && mockVideoElement) {
        return mockVideoElement;
      }
      return originalCreateElement.call(this, tagName);
    };
  });

  afterAll(() => {
    HTMLDocument.prototype.createElement = originalCreateElement;
  });

  // Helper para criar mock de vídeo element
  const createMockVideoElement = (duration = 60, width = 1920, height = 1080) => {
    // Cria um elemento de vídeo real do DOM
    const realVideo = originalCreateElement.call(document, 'video');

    // Adiciona propriedades mockadas
    Object.defineProperties(realVideo, {
      duration: { value: duration, writable: true },
      videoWidth: { value: width, writable: true },
      videoHeight: { value: height, writable: true },
      preload: { value: '', writable: true },
      src: { value: '', writable: true }
    });

    mockVideoElement = realVideo;

    // Simula o evento onloadedmetadata após um tick
    setTimeout(() => {
      if (mockVideoElement.onloadedmetadata) {
        mockVideoElement.onloadedmetadata();
      }
    }, 0);

    return mockVideoElement;
  };

  describe('Renderização', () => {
    it('deve renderizar o título do modal', () => {
      renderUploadModal();
      expect(screen.getByText(/upload novo vídeo/i)).toBeInTheDocument();
    });

    it('deve renderizar a dropzone', () => {
      renderUploadModal();
      expect(screen.getByText(/arraste um vídeo aqui/i)).toBeInTheDocument();
    });

    it('deve exibir formatos aceitos', () => {
      renderUploadModal();
      expect(screen.getByText(/mp4.*avi.*mov.*mkv.*webm/i)).toBeInTheDocument();
    });

    it('deve exibir tamanho máximo', () => {
      renderUploadModal();
      expect(screen.getByText(/500mb/i)).toBeInTheDocument();
    });

    it('deve renderizar botões de ação', () => {
      renderUploadModal();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar vídeo/i })).toBeInTheDocument();
    });
  });

  describe('Seleção de arquivo', () => {
    it('deve aceitar arquivo mp4 válido', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText(/video.mp4/i)).toBeInTheDocument();
      });
    });

    it('deve aceitar arquivo avi', async () => {
      createMockVideoElement(60, 1280, 720);
      renderUploadModal();

      const file = createMockFile('video.avi', 1024 * 1024, 'video/x-msvideo');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(videoAPI.getUploadUrl).toHaveBeenCalled();
      });
    });

    it('deve aceitar arquivo mov', async () => {
      createMockVideoElement(60, 1280, 720);
      renderUploadModal();

      const file = createMockFile('video.mov', 1024 * 1024, 'video/quicktime');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(videoAPI.getUploadUrl).toHaveBeenCalled();
      });
    });

    it('deve rejeitar formato não suportado', async () => {
      renderUploadModal();

      const file = createMockFile('document.pdf', 1024, 'application/pdf');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText(/formato não suportado/i)).toBeInTheDocument();
      });
    });

    it('deve rejeitar arquivo muito grande', async () => {
      renderUploadModal();

      const file = createMockFile('large.mp4', 600 * 1024 * 1024); // 600 MB
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText(/arquivo muito grande/i)).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de preparando upload', async () => {
      createMockVideoElement(60, 1920, 1080);

      // Mock com delay para capturar o estado de "preparando"
      videoAPI.getUploadUrl.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          uploadUrl: 'https://s3.amazonaws.com/test-bucket/test.mp4',
          fileName: 'abc123.mp4',
          s3Key: 'videos/abc123.mp4',
          expiresIn: '15 minutos'
        }), 100))
      );

      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      // Busca imediatamente após a mudança do arquivo
      expect(screen.getByText(/preparando upload/i)).toBeInTheDocument();

      // Aguarda o upload URL ser obtido
      await waitFor(() => {
        expect(videoAPI.getUploadUrl).toHaveBeenCalled();
      });
    });

    it('deve gerar UUID curto para o vídeo', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText(/id do vídeo/i)).toBeInTheDocument();
      });
    });

    it('deve exibir erro ao falhar obtenção de URL de upload', async () => {
      createMockVideoElement(60, 1920, 1080);
      videoAPI.getUploadUrl.mockRejectedValueOnce(new Error('Erro na API'));
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText(/erro ao preparar upload/i)).toBeInTheDocument();
      });
    });
  });

  describe('Metadata do vídeo', () => {
    it('deve carregar duração do vídeo', async () => {
      createMockVideoElement(120, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText(/120 s/i)).toBeInTheDocument();
      });
    });

    it('deve detectar resolução 1080p e habilitar qualidade ultra', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        const qualitySelect = screen.getByLabelText(/qualidade/i);
        expect(qualitySelect.value).toBe('ultra');
      });
    });

    it('deve detectar resolução 720p e habilitar qualidade alta', async () => {
      createMockVideoElement(60, 1280, 720);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        const qualitySelect = screen.getByLabelText(/qualidade/i);
        expect(qualitySelect.value).toBe('high');
      });
    });

    it('deve detectar resolução 480p e habilitar qualidade média', async () => {
      createMockVideoElement(60, 854, 480);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        const qualitySelect = screen.getByLabelText(/qualidade/i);
        expect(qualitySelect.value).toBe('medium');
      });
    });

    it('deve detectar resolução baixa e habilitar apenas qualidade baixa', async () => {
      createMockVideoElement(60, 640, 360);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        const qualitySelect = screen.getByLabelText(/qualidade/i);
        expect(qualitySelect.value).toBe('low');
      });
    });
  });

  describe('Interações do Modal', () => {
    it('deve chamar onClose ao clicar no X', () => {
      renderUploadModal();
      fireEvent.click(screen.getByText('×'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('deve exibir mensagem de cancelamento ao clicar em Cancelar', async () => {
      renderUploadModal();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
      });

      expect(screen.getByText(/upload cancelado/i)).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Validações de formulário', () => {
    it('deve desabilitar botão de envio sem arquivo', () => {
      renderUploadModal();
      const submitButton = screen.getByRole('button', { name: /enviar vídeo/i });
      expect(submitButton).toBeDisabled();
    });

    it('deve validar tempo inicial menor que tempo final', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/tempo inicial/i)).toBeInTheDocument();
      });

      const startTimeInput = screen.getByLabelText(/tempo inicial/i);
      const endTimeInput = screen.getByLabelText(/tempo final/i);

      await act(async () => {
        fireEvent.change(startTimeInput, { target: { value: '50' } });
        fireEvent.blur(startTimeInput);
      });

      await act(async () => {
        fireEvent.change(endTimeInput, { target: { value: '40' } });
        fireEvent.blur(endTimeInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/tempo final deve ser maior que o tempo inicial/i)).toBeInTheDocument();
      });
    });

    it('deve validar tempo inicial não negativo', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/tempo inicial/i)).toBeInTheDocument();
      });

      const startTimeInput = screen.getByLabelText(/tempo inicial/i);

      await act(async () => {
        fireEvent.change(startTimeInput, { target: { value: '-5' } });
        fireEvent.blur(startTimeInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/tempo inicial deve ser maior ou igual a 0/i)).toBeInTheDocument();
      });
    });

    it('deve validar intervalo obrigatório', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/intervalo é obrigatório/i)).toBeInTheDocument();
      });
    });

    it('deve validar intervalo único positivo', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '-5' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/intervalo deve ser um número maior que zero/i)).toBeInTheDocument();
      });
    });

    it('deve validar múltiplos intervalos', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10,20,30' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.queryByText(/intervalo deve ser um número maior que zero/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Conversão de unidade de tempo', () => {
    it('deve converter de segundos para milissegundos', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/unidade de tempo/i)).toBeInTheDocument();
      });

      const timeUnitSelect = screen.getByLabelText(/unidade de tempo/i);
      const startTimeInput = screen.getByLabelText(/tempo inicial/i);

      await act(async () => {
        fireEvent.change(startTimeInput, { target: { value: '10' } });
      });

      await act(async () => {
        fireEvent.change(timeUnitSelect, { target: { value: 'milliseconds' } });
      });

      await waitFor(() => {
        expect(startTimeInput.value).toBe('10000');
      });
    });

    it('deve converter de milissegundos para segundos', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/unidade de tempo/i)).toBeInTheDocument();
      });

      const timeUnitSelect = screen.getByLabelText(/unidade de tempo/i);

      await act(async () => {
        fireEvent.change(timeUnitSelect, { target: { value: 'milliseconds' } });
      });

      const startTimeInput = screen.getByLabelText(/tempo inicial/i);

      await act(async () => {
        fireEvent.change(startTimeInput, { target: { value: '5000' } });
      });

      await act(async () => {
        fireEvent.change(timeUnitSelect, { target: { value: 'seconds' } });
      });

      await waitFor(() => {
        expect(startTimeInput.value).toBe('5');
      });
    });
  });

  describe('Preview de captura', () => {
    it('deve exibir preview para intervalo único', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/serão capturadas.*imagens/i)).toBeInTheDocument();
      });
    });

    it('deve exibir preview para múltiplos intervalos', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '5,10,15,20' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/serão capturadas 4 imagens/i)).toBeInTheDocument();
      });
    });

    it('deve bloquear tempo inicial e final com múltiplos intervalos', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '5,10,15' } });
      });

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText(/tempo inicial/i);
        const endTimeInput = screen.getByLabelText(/tempo final/i);
        expect(startTimeInput).toBeDisabled();
        expect(endTimeInput).toBeDisabled();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('deve ativar estilo ao arrastar arquivo', () => {
      renderUploadModal();
      const dropzone = screen.getByText(/arraste um vídeo aqui/i).closest('.dropzone');

      fireEvent.dragEnter(dropzone);
      expect(dropzone).toHaveClass('active');
    });

    it('deve desativar estilo ao sair da área', () => {
      renderUploadModal();
      const dropzone = screen.getByText(/arraste um vídeo aqui/i).closest('.dropzone');

      fireEvent.dragEnter(dropzone);
      fireEvent.dragLeave(dropzone);
      expect(dropzone).not.toHaveClass('active');
    });

    it('deve aceitar arquivo via drag and drop', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('dropped.mp4');
      const dropzone = screen.getByText(/arraste um vídeo aqui/i).closest('.dropzone');

      await act(async () => {
        fireEvent.drop(dropzone, {
          dataTransfer: { files: [file] }
        });
      });

      await waitFor(() => {
        expect(videoAPI.getUploadUrl).toHaveBeenCalled();
      });
    });

    it('deve prevenir comportamento padrão no dragover', () => {
      renderUploadModal();
      const dropzone = screen.getByText(/arraste um vídeo aqui/i).closest('.dropzone');

      const event = new Event('dragover', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      fireEvent(dropzone, event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Upload de vídeo', () => {
    it('deve fazer upload com sucesso', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10' } });
      });

      const submitButton = screen.getByRole('button', { name: /enviar vídeo/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(uploadToS3).toHaveBeenCalled();
        expect(videoAPI.uploadVideoMetadata).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('deve exibir progresso durante upload', async () => {
      createMockVideoElement(60, 1920, 1080);

      // Mock com delay e callback de progresso
      uploadToS3.mockImplementation((url, file, progressCallback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            progressCallback(50);
            setTimeout(() => {
              resolve({ status: 200 });
            }, 100);
          }, 50);
        });
      });

      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10' } });
      });

      const submitButton = screen.getByRole('button', { name: /enviar vídeo/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      // Aguarda o progresso ser exibido
      await waitFor(() => {
        expect(screen.getByText(/Enviando: 50%/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('deve exibir erro ao falhar upload S3', async () => {
      createMockVideoElement(60, 1920, 1080);
      uploadToS3.mockRejectedValueOnce(new Error('Erro no upload S3'));

      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10' } });
      });

      const submitButton = screen.getByRole('button', { name: /enviar vídeo/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/erro no upload s3/i)).toBeInTheDocument();
      });
    });

    it('deve exibir erro ao falhar upload de metadata', async () => {
      createMockVideoElement(60, 1920, 1080);
      videoAPI.uploadVideoMetadata.mockRejectedValueOnce(new Error('Erro no upload de metadata'));

      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10' } });
      });

      const submitButton = screen.getByRole('button', { name: /enviar vídeo/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/erro no upload de metadata/i)).toBeInTheDocument();
      });
    });

    it('deve validar upload sem informações de URL', async () => {
      createMockVideoElement(60, 1920, 1080);

      // Mock retornando objeto sem uploadUrl
      videoAPI.getUploadUrl.mockResolvedValue({
        fileName: 'abc123.mp4',
        s3Key: 'videos/abc123.mp4'
        // uploadUrl está faltando propositalmente
      });

      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      // Aguarda o arquivo ser processado
      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10' } });
      });

      // Verifica que o botão de envio está DESABILITADO quando não há uploadUrl
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /enviar vídeo/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Cancelamento de upload', () => {
    it('deve cancelar upload em andamento', async () => {
      createMockVideoElement(60, 1920, 1080);

      let abortSignal;
      uploadToS3.mockImplementation((url, file, progressCallback, signal) => {
        abortSignal = signal;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (signal.aborted) {
              reject(new Error('Upload cancelado'));
            } else {
              resolve({ status: 200 });
            }
          }, 1000);
        });
      });

      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/intervalo/i)).toBeInTheDocument();
      });

      const intervalInput = screen.getByLabelText(/intervalo/i);

      await act(async () => {
        fireEvent.change(intervalInput, { target: { value: '10' } });
      });

      const submitButton = screen.getByRole('button', { name: /enviar vídeo/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      // Aguarda o upload iniciar - busca pelo botão desabilitado
      await waitFor(() => {
        const uploadingButton = screen.getByRole('button', { name: /enviando/i });
        expect(uploadingButton).toBeDisabled();
      });

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(screen.getByText(/upload cancelado/i)).toBeInTheDocument();
    });
  });

  describe('Qualidade do vídeo', () => {
    it('deve mudar opção de qualidade', async () => {
      createMockVideoElement(60, 1920, 1080);
      renderUploadModal();

      const file = createMockFile('video.mp4');
      const input = document.querySelector('input[type="file"]');

      await act(async () => {
        Object.defineProperty(input, 'files', { value: [file], writable: false });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/qualidade/i)).toBeInTheDocument();
      });

      const qualitySelect = screen.getByLabelText(/qualidade/i);

      await act(async () => {
        fireEvent.change(qualitySelect, { target: { value: 'high' } });
      });

      expect(qualitySelect.value).toBe('high');
    });
  });
});
