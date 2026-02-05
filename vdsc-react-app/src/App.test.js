import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock Amplify
jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn()
  }
}));

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn()
}));

jest.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }) => {
    return <div data-testid="authenticator">{children}</div>;
  }
}));

// Mock child components
jest.mock('./components/Dashboard/Dashboard', () => {
  return function DummyDashboard() {
    return <div data-testid="dashboard">Dashboard Component</div>;
  };
});

jest.mock('./components/Auth/Login', () => {
  return function DummyLogin() {
    return <div data-testid="login">Login Component</div>;
  };
});

const { getCurrentUser } = require('aws-amplify/auth');

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('deve renderizar o componente App', async () => {
      getCurrentUser.mockResolvedValue({ userId: 'test-user' });

      const { container } = render(<App />);
      expect(container).toBeInTheDocument();
    });

    it('deve renderizar o Authenticator do Amplify', async () => {
      getCurrentUser.mockResolvedValue({ userId: 'test-user' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticator')).toBeInTheDocument();
      });
    });

    it('deve aplicar estilos CSS do App', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.App')).toBeInTheDocument();
    });
  });

  describe('Authentication State', () => {
    it('deve renderizar Dashboard quando usuário está autenticado', async () => {
      getCurrentUser.mockResolvedValue({ userId: 'test-user' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('deve renderizar Login quando usuário não está autenticado', async () => {
      getCurrentUser.mockRejectedValue(new Error('Not authenticated'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('login')).toBeInTheDocument();
      });
    });
  });

  describe('Component Structure', () => {
    it('deve ter estrutura HTML correta', () => {
      const { container } = render(<App />);

      const appDiv = container.querySelector('.App');
      expect(appDiv).toBeInTheDocument();
    });

    it('deve conter elementos de rota ou condicional', async () => {
      getCurrentUser.mockResolvedValue({ userId: 'test-user' });

      const { container } = render(<App />);

      await waitFor(() => {
        expect(container.querySelector('[data-testid="authenticator"]')).toBeInTheDocument();
      });
    });
  });
});
