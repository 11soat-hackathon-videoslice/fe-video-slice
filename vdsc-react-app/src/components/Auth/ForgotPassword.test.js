import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import ForgotPassword from './ForgotPassword';

describe('ForgotPassword Component', () => {
  const mockOnSwitchToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderForgotPassword = () => {
    return render(<ForgotPassword onSwitchToLogin={mockOnSwitchToLogin} />);
  };

  describe('Tela de Solicitação', () => {
    it('deve renderizar formulário de solicitação de reset', () => {
      renderForgotPassword();
      expect(screen.getByRole('heading', { name: /esqueci minha senha/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar código/i })).toBeInTheDocument();
    });

    it('deve chamar resetPassword e mostrar tela de reset', async () => {
      resetPassword.mockResolvedValue({ isPasswordReset: false });
      renderForgotPassword();

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

      await waitFor(() => {
        expect(resetPassword).toHaveBeenCalledWith({ username: 'test@example.com' });
        expect(screen.getByRole('heading', { name: /redefinir senha/i })).toBeInTheDocument();
      });
    });

    it('deve exibir loading durante solicitação', async () => {
      resetPassword.mockImplementation(() => new Promise(() => {}));
      renderForgotPassword();

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

      expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();
    });

    it('deve exibir erro quando solicitação falha', async () => {
      resetPassword.mockRejectedValue(new Error('User not found'));
      renderForgotPassword();

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument();
      });
    });

    it('deve voltar para login', () => {
      renderForgotPassword();
      fireEvent.click(screen.getByText(/voltar para login/i));
      expect(mockOnSwitchToLogin).toHaveBeenCalled();
    });
  });

  describe('Tela de Reset', () => {
    beforeEach(async () => {
      resetPassword.mockResolvedValue({ isPasswordReset: false });
    });

    const goToResetScreen = async () => {
      renderForgotPassword();
      await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /redefinir senha/i })).toBeInTheDocument();
      });
    };

    it('deve renderizar formulário de reset', async () => {
      await goToResetScreen();
      expect(screen.getByLabelText(/código de verificação/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^nova senha$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmar nova senha/i)).toBeInTheDocument();
    });

    it('deve exibir erro quando senhas não coincidem', async () => {
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '123456');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'Different123!');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
      });
    });

    it('deve exibir erro quando senha é muito curta', async () => {
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '123456');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'Pass1!');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'Pass1!');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/a senha deve ter no mínimo 8 caracteres/i);
        expect(errorMessage).toHaveClass('error-message');
      });
    });

    it('deve exibir erro quando senha não tem maiúscula', async () => {
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '123456');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'password123!');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'password123!');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/a senha deve conter pelo menos uma letra maiúscula/i);
        expect(errorMessage).toHaveClass('error-message');
      });
    });

    it('deve exibir erro quando senha não tem minúscula', async () => {
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '123456');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'PASSWORD123!');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'PASSWORD123!');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/a senha deve conter pelo menos uma letra minúscula/i);
        expect(errorMessage).toHaveClass('error-message');
      });
    });

    it('deve exibir erro quando senha não tem número', async () => {
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '123456');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'Password!');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'Password!');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/a senha deve conter pelo menos um número/i);
        expect(errorMessage).toHaveClass('error-message');
      });
    });

    it('deve exibir erro quando senha não tem caractere especial', async () => {
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '123456');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'Password123');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'Password123');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/a senha deve conter pelo menos um caractere especial/i);
        expect(errorMessage).toHaveClass('error-message');
      });
    });

    it('deve confirmar reset e redirecionar para login', async () => {
      confirmResetPassword.mockResolvedValue({});
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '123456');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'Password123!');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        expect(confirmResetPassword).toHaveBeenCalledWith({
          username: 'test@example.com',
          confirmationCode: '123456',
          newPassword: 'Password123!'
        });
        expect(screen.getByText(/senha redefinida com sucesso/i)).toBeInTheDocument();
      });

      // Aguarda o timeout do componente chamar onSwitchToLogin
      await waitFor(() => {
        expect(mockOnSwitchToLogin).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('deve exibir erro quando confirmação falha', async () => {
      confirmResetPassword.mockRejectedValue(new Error('Invalid code'));
      await goToResetScreen();

      await userEvent.type(screen.getByLabelText(/código de verificação/i), '000000');
      await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'Password123!');
      await userEvent.type(screen.getByLabelText(/confirmar nova senha/i), 'Password123!');
      fireEvent.click(screen.getByRole('button', { name: /redefinir senha/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
      });
    });

    it('deve voltar para login da tela de reset', async () => {
      await goToResetScreen();
      fireEvent.click(screen.getByText(/voltar para login/i));
      expect(mockOnSwitchToLogin).toHaveBeenCalled();
    });
  });
});
