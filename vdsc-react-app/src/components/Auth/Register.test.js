import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signUp, confirmSignUp, autoSignIn } from 'aws-amplify/auth';
import Register from './Register';

describe('Register Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnSwitchToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderRegister = () => {
    return render(
      <Register
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );
  };

  describe('Renderização', () => {
    it('deve renderizar o formulário de registro', () => {
      renderRegister();
      expect(screen.getByRole('heading', { name: /criar conta/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    });

    it('deve renderizar link para voltar ao login', () => {
      renderRegister();
      expect(screen.getByText(/fazer login/i)).toBeInTheDocument();
    });
  });

  describe('Validação de senha', () => {
    it('deve exibir erro quando senhas não coincidem', async () => {
      renderRegister();

      fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'DifferentPass123!' } });

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('deve exibir erro quando senha é muito curta', async () => {
      renderRegister();

      fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'Pass1!' } });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'Pass1!' } });

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/deve ter no mínimo 8 caracteres/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('deve exibir erro quando senha não tem maiúscula', async () => {
      renderRegister();

      fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'password123!' } });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'password123!' } });

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/letra maiúscula/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('deve exibir erro quando senha não tem minúscula', async () => {
      renderRegister();

      fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'PASSWORD123!' } });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'PASSWORD123!' } });

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/letra minúscula/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('deve exibir erro quando senha não tem número', async () => {
      renderRegister();

      fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'Password!' } });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'Password!' } });

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/pelo menos um número/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('deve exibir erro quando senha não tem caractere especial', async () => {
      renderRegister();

      fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'Password123' } });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'Password123' } });

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/caractere especial/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Fluxo de registro', () => {
    it('deve chamar signUp e mostrar tela de confirmação', async () => {
      signUp.mockResolvedValue({ isSignUpComplete: false });
      renderRegister();

      await userEvent.type(screen.getByLabelText(/nome completo/i), 'Test User');
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Password123!');

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(signUp).toHaveBeenCalledWith({
          username: 'test@example.com',
          password: 'Password123!',
          options: {
            userAttributes: {
              email: 'test@example.com',
              name: 'Test User'
            },
            autoSignIn: true
          }
        });
        expect(screen.getByText(/confirmar e-mail/i)).toBeInTheDocument();
      });
    });

    it('deve exibir estado de loading durante registro', async () => {
      signUp.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderRegister();

      fireEvent.change(screen.getByLabelText(/nome completo/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'Password123!' } });

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /criando conta/i });
        expect(loadingButton).toBeInTheDocument();
        expect(loadingButton).toBeDisabled();
      });
    });

    it('deve exibir erro quando signUp falha', async () => {
      signUp.mockRejectedValue(new Error('User already exists'));
      renderRegister();

      await userEvent.type(screen.getByLabelText(/nome completo/i), 'Test User');
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Password123!');

      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Fluxo de confirmação', () => {
    beforeEach(async () => {
      signUp.mockResolvedValue({ isSignUpComplete: false });
    });

    it('deve confirmar código e fazer auto sign in', async () => {
      confirmSignUp.mockResolvedValue({ isSignUpComplete: true });
      autoSignIn.mockResolvedValue({ isSignedIn: true });

      renderRegister();

      await userEvent.type(screen.getByLabelText(/nome completo/i), 'Test User');
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Password123!');
      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/confirmar e-mail/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/código de confirmação/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

      await waitFor(() => {
        expect(confirmSignUp).toHaveBeenCalledWith({
          username: 'test@example.com',
          confirmationCode: '123456'
        });
        expect(autoSignIn).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('deve redirecionar para login se auto sign in falhar', async () => {
      confirmSignUp.mockResolvedValue({ isSignUpComplete: true });
      autoSignIn.mockRejectedValue(new Error('Auto sign in failed'));

      renderRegister();

      await userEvent.type(screen.getByLabelText(/nome completo/i), 'Test User');
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Password123!');
      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/confirmar e-mail/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/código de confirmação/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

      await waitFor(() => {
        expect(mockOnSwitchToLogin).toHaveBeenCalled();
      });
    });

    it('deve exibir erro quando confirmação falha', async () => {
      confirmSignUp.mockRejectedValue(new Error('Invalid code'));

      renderRegister();

      await userEvent.type(screen.getByLabelText(/nome completo/i), 'Test User');
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Password123!');
      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/confirmar e-mail/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/código de confirmação/i), '000000');
      fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
      });
    });

    it('deve voltar para login da tela de confirmação', async () => {
      renderRegister();

      await userEvent.type(screen.getByLabelText(/nome completo/i), 'Test User');
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Password123!');
      fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

      await waitFor(() => {
        expect(screen.getByText(/confirmar e-mail/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/voltar para login/i));
      expect(mockOnSwitchToLogin).toHaveBeenCalled();
    });
  });

  describe('Navegação', () => {
    it('deve chamar onSwitchToLogin ao clicar em Fazer login', () => {
      renderRegister();
      fireEvent.click(screen.getByText(/fazer login/i));
      expect(mockOnSwitchToLogin).toHaveBeenCalled();
    });
  });
});
