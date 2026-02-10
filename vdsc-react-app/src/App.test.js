import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { getCurrentUser } from 'aws-amplify/auth';
import App from './App';

// Mock child components
jest.mock('./components/Auth/Login', () => {
  return function MockLogin({ onSuccess, onSwitchToRegister, onSwitchToForgotPassword }) {
    return (
      <div data-testid="login-component">
        <button onClick={onSuccess} data-testid="login-success">Login Success</button>
        <button onClick={onSwitchToRegister} data-testid="switch-register">Register</button>
        <button onClick={onSwitchToForgotPassword} data-testid="switch-forgot">Forgot</button>
      </div>
    );
  };
});

jest.mock('./components/Auth/Register', () => {
  return function MockRegister({ onSuccess, onSwitchToLogin }) {
    return (
      <div data-testid="register-component">
        <button onClick={onSuccess} data-testid="register-success">Register Success</button>
        <button onClick={onSwitchToLogin} data-testid="switch-login">Back to Login</button>
      </div>
    );
  };
});

jest.mock('./components/Auth/ForgotPassword', () => {
  return function MockForgotPassword({ onSwitchToLogin }) {
    return (
      <div data-testid="forgot-password-component">
        <button onClick={onSwitchToLogin} data-testid="forgot-to-login">Back to Login</button>
      </div>
    );
  };
});

jest.mock('./components/Dashboard/Dashboard', () => {
  return function MockDashboard({ onSignOut }) {
    return (
      <div data-testid="dashboard-component">
        <button onClick={onSignOut} data-testid="sign-out">Sign Out</button>
      </div>
    );
  };
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Estado de Loading', () => {
    it('deve exibir spinner de carregamento inicialmente', () => {
      getCurrentUser.mockImplementation(() => new Promise(() => {}));
      render(<App />);
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });
  });

  describe('Usuário não autenticado', () => {
    beforeEach(() => {
      getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    });

    it('deve exibir tela de Login quando não autenticado', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });
    });

    it('deve navegar para Register ao clicar no botão', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('switch-register'));
      expect(screen.getByTestId('register-component')).toBeInTheDocument();
    });

    it('deve navegar para ForgotPassword ao clicar no botão', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('switch-forgot'));
      expect(screen.getByTestId('forgot-password-component')).toBeInTheDocument();
    });

    it('deve voltar para Login do ForgotPassword', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('switch-forgot'));
      expect(screen.getByTestId('forgot-password-component')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('forgot-to-login'));
      expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });

    it('deve voltar para Login do Register', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('switch-register'));
      expect(screen.getByTestId('register-component')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('switch-login'));
      expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });
  });

  describe('Usuário autenticado', () => {
    beforeEach(() => {
      getCurrentUser.mockResolvedValue({ userId: 'test-user-id' });
    });

    it('deve exibir Dashboard quando autenticado', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
      });
    });

    it('deve fazer sign out e voltar para Login', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sign-out'));
      expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });
  });

  describe('Sucesso de autenticação', () => {
    beforeEach(() => {
      getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    });

    it('deve navegar para Dashboard após login bem sucedido', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('login-success'));
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    });

    it('deve navegar para Dashboard após registro bem sucedido', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('login-component')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('switch-register'));
      expect(screen.getByTestId('register-component')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('register-success'));
      expect(screen.getByTestId('dashboard-component')).toBeInTheDocument();
    });
  });
});
