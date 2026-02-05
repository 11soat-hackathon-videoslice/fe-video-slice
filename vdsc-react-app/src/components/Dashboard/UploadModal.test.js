import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadModal from './UploadModal';
import { videoAPI } from '../../services/api';

// Mock dependencies
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn()
}));

jest.mock('../../services/api', () => ({
  videoAPI: {
    getUploadUrl: jest.fn(),
    uploadVideoMetadata: jest.fn()
  },
  uploadToS3: jest.fn()
}));

const { getCurrentUser } = require('aws-amplify/auth');

// Helper to create mock file
const createMockVideoFile = (name = 'test.mp4', duration = 100) => {
  const blob = new Blob(['test'], { type: 'video/mp4' });
  const file = new File([blob], name, { type: 'video/mp4' });

  // Mock video metadata
  Object.defineProperty(file, 'duration', { value: duration });

  return file;
};

// Helper to mock video metadata loading
const mockVideoMetadata = (width = 1920, height = 1080) => {
  const originalCreateElement = document.createElement;
  document.createElement = jest.fn((tag) => {
    if (tag === 'video') {
      const video = originalCreateElement.call(document, tag);
      Object.defineProperty(video, 'videoWidth', { value: width, writable: true });
      Object.defineProperty(video, 'videoHeight', { value: height, writable: true });
      Object.defineProperty(video, 'duration', { value: 100, writable: true });

      // Simulate video load
      setTimeout(() => {
        if (video.onloadedmetadata) {
          video.onloadedmetadata();
        }
      }, 0);

      return video;
    }
    return originalCreateElement.call(document, tag);
  });
};

describe('UploadModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVideoMetadata(1920, 1080);

    getCurrentUser.mockResolvedValue({
      userId: 'test-user-123',
      username: 'testuser'
    });

    videoAPI.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/test-upload',
      fileName: 'test_file_123.mp4',
      s3Key: 'videos/test_file_123.mp4',
      expiresIn: 3600
    });

    videoAPI.uploadVideoMetadata.mockResolvedValue({ success: true });
  });

  describe('Modal Rendering', () => {
    it('deve renderizar o modal com título corretamente', () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);
      expect(screen.getByText('Upload Novo Vídeo')).toBeInTheDocument();
    });

    it('deve exibir a zona de drop inicialmente', () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);
      expect(screen.getByText(/Clique para selecionar/i)).toBeInTheDocument();
    });

    it('deve fechar o modal quando clicar no botão de fechar', () => {
      const onClose = jest.fn();
      const { container } = render(<UploadModal onClose={onClose} onSuccess={jest.fn()} />);

      const closeButton = container.querySelector('.modal-close');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Tempo Inicial Validation', () => {
    it('deve permitir tempo inicial igual a 0', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      const fileInput = screen.getByDisplayValue('');
      const file = createMockVideoFile();

      await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        const startTimeInput = screen.getByDisplayValue('0');
        expect(startTimeInput).toHaveValue(0);
      });
    });

    it('deve rejeitar tempo inicial negativo', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        fireEvent.change(startTimeInput, { target: { value: '-5' } });
        fireEvent.blur(startTimeInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Tempo inicial deve ser maior ou igual a 0/i)).toBeInTheDocument();
      });
    });

    it('deve rejeitar tempo inicial maior ou igual ao tempo final', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        const endTimeInput = screen.getByLabelText('Tempo Final *');

        fireEvent.change(endTimeInput, { target: { value: '50' } });
        fireEvent.blur(endTimeInput);

        fireEvent.change(startTimeInput, { target: { value: '50' } });
        fireEvent.blur(startTimeInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Tempo inicial deve ser menor que o tempo final/i)).toBeInTheDocument();
      });
    });

    it('deve validar em tempo real enquanto o usuário digita', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        fireEvent.change(startTimeInput, { target: { value: '-1' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Tempo inicial deve ser maior ou igual a 0/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Tempo Final Validation', () => {
    it('deve rejeitar tempo final maior que a duração do vídeo', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const endTimeInput = screen.getByLabelText('Tempo Final *');
        fireEvent.change(endTimeInput, { target: { value: '200' } });
        fireEvent.blur(endTimeInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Tempo final deve ser menor ou igual à duração do vídeo/i)).toBeInTheDocument();
      });
    });

    it('deve rejeitar tempo final menor ou igual ao tempo inicial', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        const endTimeInput = screen.getByLabelText('Tempo Final *');

        fireEvent.change(startTimeInput, { target: { value: '50' } });
        fireEvent.blur(startTimeInput);

        fireEvent.change(endTimeInput, { target: { value: '50' } });
        fireEvent.blur(endTimeInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Tempo final deve ser maior que o tempo inicial/i)).toBeInTheDocument();
      });
    });

    it('deve re-validar tempo inicial quando tempo final é alterado', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        const endTimeInput = screen.getByLabelText('Tempo Final *');

        fireEvent.change(startTimeInput, { target: { value: '80' } });
        fireEvent.blur(startTimeInput);

        fireEvent.change(endTimeInput, { target: { value: '70' } });
        fireEvent.blur(endTimeInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Tempo inicial deve ser menor que o tempo final/i)).toBeInTheDocument();
      });
    });
  });

  describe('Intervalo - Valor Único', () => {
    it('deve rejeitar intervalo menor ou igual a zero', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '0' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Intervalo deve ser um número maior que zero/i)).toBeInTheDocument();
      });
    });

    it('deve rejeitar intervalo maior que a duração do vídeo', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '200' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Intervalo deve ser menor ou igual à duração do vídeo/i)).toBeInTheDocument();
      });
    });

    it('deve exibir preview para intervalo válido com menos de 7 momentos', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        const endTimeInput = screen.getByLabelText('Tempo Final *');
        const intervalInput = screen.getByLabelText('Intervalo *');

        fireEvent.change(startTimeInput, { target: { value: '0' } });
        fireEvent.blur(startTimeInput);

        fireEvent.change(endTimeInput, { target: { value: '30' } });
        fireEvent.blur(endTimeInput);

        fireEvent.change(intervalInput, { target: { value: '5' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Serão capturadas 7 imagens nos momentos/i)).toBeInTheDocument();
      });
    });

    it('deve exibir preview com reticências para muitos momentos', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        const endTimeInput = screen.getByLabelText('Tempo Final *');
        const intervalInput = screen.getByLabelText('Intervalo *');

        fireEvent.change(startTimeInput, { target: { value: '0' } });
        fireEvent.blur(startTimeInput);

        fireEvent.change(endTimeInput, { target: { value: '100' } });
        fireEvent.blur(endTimeInput);

        fireEvent.change(intervalInput, { target: { value: '5' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
      });
    });
  });

  describe('Intervalo - Valores Múltiplos', () => {
    it('deve bloquear tempo inicial quando múltiplos intervalos são definidos', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '10,20,30' } });
      });

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        expect(startTimeInput).toBeDisabled();
      });
    });

    it('deve bloquear tempo final quando múltiplos intervalos são definidos', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '10,20,30' } });
      });

      await waitFor(() => {
        const endTimeInput = screen.getByLabelText('Tempo Final *');
        expect(endTimeInput).toBeDisabled();
      });
    });

    it('deve desbloquear tempo inicial e final quando intervalo é alterado para valor único', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');

        // Primeiro define múltiplos
        fireEvent.change(intervalInput, { target: { value: '10,20,30' } });
      });

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        expect(startTimeInput).toBeDisabled();
      });

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        // Depois muda para valor único
        fireEvent.change(intervalInput, { target: { value: '5' } });
      });

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        expect(startTimeInput).not.toBeDisabled();
      });
    });

    it('deve rejeitar valores não numéricos em múltiplos intervalos', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '10,abc,30' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Todos os valores devem ser números maiores ou iguais a zero/i)).toBeInTheDocument();
      });
    });

    it('deve exibir preview para múltiplos intervalos válidos', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '5,21,33,57' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Serão capturadas 4 imagens nos momentos/i)).toBeInTheDocument();
      });
    });

    it('deve desprezar valores fora da duração máxima no preview', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '5,21,33,150,200' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Os valores fora do intervalo válido serão desprezados/i)).toBeInTheDocument();
      });
    });

    it('deve rejeitar quando todos os valores estão fora do intervalo', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '150,200,300' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/Pelo menos um valor deve estar dentro da duração do vídeo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Qualidade - Disponibilidade por Resolução', () => {
    it('deve desabilitar Ultra para vídeo abaixo de 1080p', async () => {
      mockVideoMetadata(1280, 720);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const ultraOption = screen.getByDisplayValue('ultra');
        expect(ultraOption).toBeDisabled();
      });
    });

    it('deve habilitar Ultra para vídeo com 1080p ou superior', async () => {
      mockVideoMetadata(1920, 1080);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const ultraOption = screen.getByDisplayValue('ultra');
        expect(ultraOption).not.toBeDisabled();
      });
    });

    it('deve desabilitar Alta para vídeo abaixo de 720p', async () => {
      mockVideoMetadata(854, 480);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const highOption = screen.getByDisplayValue('high');
        expect(highOption).toBeDisabled();
      });
    });

    it('deve habilitar Alta para vídeo com 720p ou superior', async () => {
      mockVideoMetadata(1280, 720);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const highOption = screen.getByDisplayValue('high');
        expect(highOption).not.toBeDisabled();
      });
    });

    it('deve desabilitar Média para vídeo abaixo de 480p', async () => {
      mockVideoMetadata(640, 360);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const mediumOption = screen.getByDisplayValue('medium');
        expect(mediumOption).toBeDisabled();
      });
    });

    it('deve habilitar Média para vídeo com 480p ou superior', async () => {
      mockVideoMetadata(854, 480);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const mediumOption = screen.getByDisplayValue('medium');
        expect(mediumOption).not.toBeDisabled();
      });
    });

    it('deve sempre habilitar Baixa', async () => {
      mockVideoMetadata(640, 360);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const lowOption = screen.getByDisplayValue('low');
        expect(lowOption).not.toBeDisabled();
      });
    });

    it('deve selecionar Ultra por padrão para 1080p+', async () => {
      mockVideoMetadata(1920, 1080);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const qualitySelect = screen.getByDisplayValue('ultra');
        expect(qualitySelect).toHaveValue('ultra');
      });
    });

    it('deve selecionar Alta por padrão para 720p', async () => {
      mockVideoMetadata(1280, 720);
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const qualitySelect = screen.getByDisplayValue('high');
        expect(qualitySelect).toHaveValue('high');
      });
    });
  });

  describe('Botão Enviar Vídeo', () => {
    it('deve desabilitar o botão quando há erros de validação', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Enviar Vídeo/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('deve desabilitar o botão quando intervalo é inválido', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '0' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Enviar Vídeo/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('deve desabilitar o botão quando tempo inicial é inválido', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText('Tempo Inicial *');
        fireEvent.change(startTimeInput, { target: { value: '-5' } });
        fireEvent.blur(startTimeInput);
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Enviar Vídeo/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('deve desabilitar o botão quando tempo final é inválido', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const endTimeInput = screen.getByLabelText('Tempo Final *');
        fireEvent.change(endTimeInput, { target: { value: '200' } });
        fireEvent.blur(endTimeInput);
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Enviar Vídeo/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Labels e Hints', () => {
    it('deve exibir label em português para qualidade Ultra', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Ultra - 1080p\+/)).toBeInTheDocument();
      });
    });

    it('deve exibir label em português para qualidade Alta', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Alta - 720p\+/)).toBeInTheDocument();
      });
    });

    it('deve exibir label em português para qualidade Média', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Média - 480p\+/)).toBeInTheDocument();
      });
    });

    it('deve exibir label em português para qualidade Baixa', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Baixa - 360p\+/)).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de ajuda para intervalo', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      expect(screen.getByText(/Preencher com único valor captura recorrente/i)).toBeInTheDocument();
      expect(screen.getByText(/Preencher com valores separados por vírgula/i)).toBeInTheDocument();
    });

    it('deve exibir label "Duração" (não "Duração Máxima")', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      expect(screen.getByText('Duração:')).toBeInTheDocument();
    });
  });

  describe('Preview Messages', () => {
    it('deve exibir preview com fundo verde quando válido', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '10' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        const preview = screen.getByText(/Serão capturadas/);
        expect(preview).toHaveStyle({ backgroundColor: '#d4edda' });
      });
    });

    it('não deve exibir preview quando há erro de validação', async () => {
      render(<UploadModal onClose={jest.fn()} onSuccess={jest.fn()} />);

      await waitFor(() => {
        const intervalInput = screen.getByLabelText('Intervalo *');
        fireEvent.change(intervalInput, { target: { value: '0' } });
        fireEvent.blur(intervalInput);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Serão capturadas/)).not.toBeInTheDocument();
      });
    });
  });
});
