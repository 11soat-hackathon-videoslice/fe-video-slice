import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// Mock dependencies
jest.mock('aws-amplify/auth', () => ({
  signIn: jest.fn(),
  signUp: jest.fn()
}));

jest.mock('./Register', () => {
  return function DummyRegister({ onBack }) {
    return (
      <div data-testid="register">
        <button onClick={onBack}>Back to Login</button>
      </div>
    );
  };
});

jest.mock('./ForgotPassword', () => {
  return function DummyForgotPassword({ onBack }) {
    return (
      <div data-testid="forgot-password">
        <button onClick={onBack}>Back to Login</button>
      </div>
    );
  };
});

const { signIn } = require('aws-amplify/auth');

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('deve renderizar o formulário de login', () => {
      render(<Login />);
      expect(screen.getByText(/faça login/i)).toBeInTheDocument();
    });

    it('deve exibir campo de email', () => {
      render(<Login />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('deve exibir campo de senha', () => {
      render(<Login />);
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    });

    it('deve exibir botão de login', () => {
      render(<Login />);
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('deve exibir link para registrar', () => {
      render(<Login />);
      expect(screen.getByText(/cadastre-se/i)).toBeInTheDocument();
    });

    it('deve exibir link para recuperar senha', () => {
      render(<Login />);
      expect(screen.getByText(/esqueci minha senha/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('deve exigir email', async () => {
      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument();
      });
    });

    it('deve exigir senha', async () => {
      render(<Login />);

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/senha é obrigatória/i)).toBeInTheDocument();
      });
    });

    it('deve validar formato de email', async () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid-email');

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
      });
    });
  });

  describe('Login Functionality', () => {
    it('deve fazer login com credenciais válidas', async () => {
      signIn.mockResolvedValue({ signInDetails: { loginWith: 'EMAIL' } });

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith({
          username: 'test@example.com',
          password: 'password123'
        });
      });
    });

    it('deve exibir mensagem de erro ao falhar login', async () => {
      signIn.mockRejectedValue(new Error('Invalid credentials'));

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
      });
    });

    it('deve desabilitar botão durante login', async () => {
      signIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      expect(loginButton).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('deve navegar para registro ao clicar no link de cadastro', async () => {
      render(<Login />);

      const registerLink = screen.getByText(/cadastre-se/i);
      fireEvent.click(registerLink);

      await waitFor(() => {
        expect(screen.getByTestId('register')).toBeInTheDocument();
      });
    });

    it('deve navegar para recuperar senha ao clicar no link', async () => {
      render(<Login />);

      const forgotLink = screen.getByText(/esqueci minha senha/i);
      fireEvent.click(forgotLink);

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password')).toBeInTheDocument();
      });
    });

    it('deve voltar para login a partir de registro', async () => {
      render(<Login />);

      const registerLink = screen.getByText(/cadastre-se/i);
      fireEvent.click(registerLink);

      await waitFor(() => {
        const backButton = screen.getByText('Back to Login');
        fireEvent.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/faça login/i)).toBeInTheDocument();
      });
    });

    it('deve voltar para login a partir de recuperar senha', async () => {
      render(<Login />);

      const forgotLink = screen.getByText(/esqueci minha senha/i);
      fireEvent.click(forgotLink);

      await waitFor(() => {
        const backButton = screen.getByText('Back to Login');
        fireEvent.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/faça login/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('deve limpar formulário após login bem-sucedido', async () => {
      signIn.mockResolvedValue({ signInDetails: { loginWith: 'EMAIL' } });

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(emailInput.value).toBe('');
        expect(passwordInput.value).toBe('');
      });
    });

    it('deve manter email preenchido em caso de erro de senha', async () => {
      signIn.mockRejectedValue(new Error('Invalid credentials'));

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');

      const loginButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(emailInput.value).toBe('test@example.com');
      });
    });
  });

  describe('Accessibility', () => {
    it('deve ter labels asociados aos inputs', () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    it('deve ter botões com nomes descritivos', () => {
      render(<Login />);

      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });
  });
});
