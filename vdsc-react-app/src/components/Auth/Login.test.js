import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'aws-amplify/auth';
import Login from './Login';

describe('Login Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnSwitchToRegister = jest.fn();
  const mockOnSwitchToForgotPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderLogin = () => {
    return render(
      <Login
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );
  };

  describe('Renderização', () => {
    it('deve renderizar o formulário de login', () => {
      renderLogin();
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('deve renderizar links para registro e recuperação de senha', () => {
      renderLogin();
      expect(screen.getByText(/esqueci minha senha/i)).toBeInTheDocument();
      expect(screen.getByText(/criar conta/i)).toBeInTheDocument();
    });

    it('deve renderizar a logo', () => {
      renderLogin();
      expect(screen.getByAltText(/video slice/i)).toBeInTheDocument();
    });
  });

  describe('Interações de formulário', () => {
    it('deve permitir digitar email e senha', async () => {
      renderLogin();
      const emailInput = screen.getByLabelText(/e-mail/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('deve chamar onSwitchToRegister ao clicar em Criar conta', () => {
      renderLogin();
      fireEvent.click(screen.getByText(/criar conta/i));
      expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
    });

    it('deve chamar onSwitchToForgotPassword ao clicar em Esqueci minha senha', () => {
      renderLogin();
      fireEvent.click(screen.getByText(/esqueci minha senha/i));
      expect(mockOnSwitchToForgotPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Submissão do formulário', () => {
    it('deve chamar signIn e onSuccess quando login é bem sucedido', async () => {
      signIn.mockResolvedValue({ isSignedIn: true });
      renderLogin();

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/senha/i), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith({
          username: 'test@example.com',
          password: 'password123'
        });
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('deve exibir estado de loading durante submissão', async () => {
      signIn.mockImplementation(() => new Promise(() => {}));
      renderLogin();

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/senha/i), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      expect(screen.getByRole('button', { name: /entrando/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();
    });

    it('deve exibir mensagem de erro quando login falha', async () => {
      signIn.mockRejectedValue(new Error('Invalid credentials'));
      renderLogin();

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/senha/i), 'wrongpassword');
      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('deve exibir mensagem padrão quando erro não tem message', async () => {
      signIn.mockRejectedValue({});
      renderLogin();

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/senha/i), 'wrongpassword');
      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText(/erro ao fazer login/i)).toBeInTheDocument();
      });
    });
  });
});
