// Mock do cliente GraphQL - definido como variável global para evitar hoisting issues
let mockGraphqlFn = jest.fn();

jest.mock('aws-amplify/api', () => ({
  __esModule: true,
  generateClient: jest.fn(() => ({
    graphql: (...args) => mockGraphqlFn(...args)
  }))
}));

jest.mock('aws-amplify/auth', () => ({
  __esModule: true,
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn()
}));

// Importa após os mocks
import { notificationService, getNotificationsByUser, markAsRead, onCreateNotification, onUpdateNotification } from './notificationService';
import { getCurrentUser } from 'aws-amplify/auth';

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGraphqlFn = jest.fn();

    getCurrentUser.mockResolvedValue({
      userId: 'test-user-id'
    });
  });

  describe('GraphQL queries e mutations', () => {
    test('getNotificationsByUser query está definida corretamente', () => {
      expect(getNotificationsByUser).toContain('query GetNotificationsByUser');
      expect(getNotificationsByUser).toContain('getNotificationsByUser');
      expect(getNotificationsByUser).toContain('$userId: ID!');
    });

    test('markAsRead mutation está definida corretamente', () => {
      expect(markAsRead).toContain('mutation MarkAsRead');
      expect(markAsRead).toContain('markAsRead');
      expect(markAsRead).toContain('$id: ID!');
    });

    test('onCreateNotification subscription está definida corretamente', () => {
      expect(onCreateNotification).toContain('subscription OnCreateNotification');
      expect(onCreateNotification).toContain('onCreateNotification');
      expect(onCreateNotification).toContain('$userId: ID!');
    });

    test('onUpdateNotification subscription está definida corretamente', () => {
      expect(onUpdateNotification).toContain('subscription OnUpdateNotification');
      expect(onUpdateNotification).toContain('onUpdateNotification');
      expect(onUpdateNotification).toContain('$id: ID!');
    });
  });

  describe('getNotifications', () => {
    test('deve buscar notificações com sucesso', async () => {
      const mockNotifications = {
        items: [
          {
            userId: 'test-user-id',
            timestamp: '2026-01-13T00:00:00Z',
            id: '1',
            message: 'Test notification',
            isRead: false
          }
        ],
        nextToken: null
      };

      mockGraphqlFn.mockResolvedValue({
        data: {
          getNotificationsByUser: mockNotifications
        }
      });

      const result = await notificationService.getNotifications(20);

      expect(getCurrentUser).toHaveBeenCalled();
      expect(mockGraphqlFn).toHaveBeenCalledWith({
        query: getNotificationsByUser,
        variables: {
          userId: 'test-user-id',
          limit: 20,
          sortDirection: 'DESC'
        },
        authMode: 'userPool'
      });
      expect(result).toEqual(mockNotifications);
    });

    test('deve buscar notificações não lidas quando isRead=false', async () => {
      const mockNotifications = {
        items: [],
        nextToken: null
      };

      mockGraphqlFn.mockResolvedValue({
        data: {
          getNotificationsByUser: mockNotifications
        }
      });

      await notificationService.getNotifications(10, false);

      expect(mockGraphqlFn).toHaveBeenCalledWith({
        query: getNotificationsByUser,
        variables: {
          userId: 'test-user-id',
          limit: 10,
          sortDirection: 'DESC',
          isRead: false
        },
        authMode: 'userPool'
      });
    });

    test('deve tratar erro de autenticação corretamente', async () => {
      const authError = new Error('Not authenticated');
      getCurrentUser.mockRejectedValue(authError);

      await expect(notificationService.getNotifications()).rejects.toThrow('Usuário não autenticado');
    });

    test('deve tratar erro ao buscar notificações', async () => {
      const mockError = new Error('Network error');
      mockGraphqlFn.mockRejectedValue(mockError);

      await expect(notificationService.getNotifications()).rejects.toThrow('Network error');
    });
  });

  describe('markAsRead', () => {
    test('deve marcar notificação como lida com sucesso', async () => {
      const mockNotification = {
        userId: 'test-user-id',
        timestamp: '2026-01-13T00:00:00Z',
        id: 'notification-123',
        message: 'Test notification',
        isRead: true
      };

      mockGraphqlFn.mockResolvedValue({
        data: {
          markAsRead: mockNotification
        }
      });

      const result = await notificationService.markAsRead('notification-123', '2026-01-13T00:00:00Z');

      expect(mockGraphqlFn).toHaveBeenCalledWith({
        query: markAsRead,
        variables: {
          id: 'notification-123',
          timestamp: '2026-01-13T00:00:00Z'
        },
        authMode: 'userPool'
      });
      expect(result).toEqual(mockNotification);
    });

    test('deve tratar erro ao marcar como lida', async () => {
      const mockError = new Error('Update error');
      mockGraphqlFn.mockRejectedValue(mockError);

      await expect(
        notificationService.markAsRead('notification-123', '2026-01-13T00:00:00Z')
      ).rejects.toThrow('Update error');
    });
  });

  describe('subscribeToNotifications', () => {
    test('deve criar subscrição com sucesso', async () => {
      const mockSubscription = {
        unsubscribe: jest.fn()
      };

      const mockSubscribe = jest.fn(() => mockSubscription);
      mockGraphqlFn.mockReturnValue({
        subscribe: mockSubscribe
      });

      const onNotification = jest.fn();
      const onError = jest.fn();

      const subscription = await notificationService.subscribeToNotifications(
        onNotification,
        onError
      );

      expect(getCurrentUser).toHaveBeenCalled();
      expect(mockGraphqlFn).toHaveBeenCalledWith({
        query: onCreateNotification,
        variables: { userId: 'test-user-id' },
        authMode: 'userPool'
      });
      expect(mockSubscribe).toHaveBeenCalled();
      expect(subscription).toBe(mockSubscription);
    });

    test('deve chamar callback onNotification quando nova notificação chega', async () => {
      const mockNotification = {
        userId: 'test-user-id',
        timestamp: '2026-01-13T00:00:00Z',
        id: '1',
        message: 'New notification',
        isRead: false
      };

      let subscribeCallback;
      const mockSubscribe = jest.fn((callbacks) => {
        subscribeCallback = callbacks;
        return { unsubscribe: jest.fn() };
      });

      mockGraphqlFn.mockReturnValue({
        subscribe: mockSubscribe
      });

      const onNotification = jest.fn();

      await notificationService.subscribeToNotifications(onNotification);

      // Simula chegada de nova notificação
      subscribeCallback.next({
        data: {
          onCreateNotification: mockNotification
        }
      });

      expect(onNotification).toHaveBeenCalledWith(mockNotification);
    });

    test('deve chamar callback onError quando ocorre erro na subscrição', async () => {
      const mockError = new Error('Subscription error');

      let subscribeCallback;
      const mockSubscribe = jest.fn((callbacks) => {
        subscribeCallback = callbacks;
        return { unsubscribe: jest.fn() };
      });

      mockGraphqlFn.mockReturnValue({
        subscribe: mockSubscribe
      });

      const onError = jest.fn();

      await notificationService.subscribeToNotifications(jest.fn(), onError);

      // Simula erro na subscrição
      subscribeCallback.error(mockError);

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    test('deve tratar erro ao criar subscrição', async () => {
      const mockError = new Error('Setup error');
      getCurrentUser.mockRejectedValue(mockError);

      const onError = jest.fn();

      await expect(
        notificationService.subscribeToNotifications(jest.fn(), onError)
      ).rejects.toThrow('Setup error');
    });
  });

  describe('subscribeToNotificationUpdates', () => {
    test('deve criar subscrição de atualizações com sucesso', async () => {
      const mockSubscription = {
        unsubscribe: jest.fn()
      };

      const mockSubscribe = jest.fn(() => mockSubscription);
      mockGraphqlFn.mockReturnValue({
        subscribe: mockSubscribe
      });

      const onUpdate = jest.fn();
      const onError = jest.fn();

      const subscription = await notificationService.subscribeToNotificationUpdates(
        'notification-123',
        onUpdate,
        onError
      );

      expect(mockGraphqlFn).toHaveBeenCalledWith({
        query: onUpdateNotification,
        variables: { id: 'notification-123' },
        authMode: 'userPool'
      });
      expect(mockSubscribe).toHaveBeenCalled();
      expect(subscription).toBe(mockSubscription);
    });

    test('deve chamar callback onUpdate quando notificação é atualizada', async () => {
      const mockNotification = {
        userId: 'test-user-id',
        timestamp: '2026-01-13T00:00:00Z',
        id: 'notification-123',
        message: 'Updated notification',
        isRead: true
      };

      let subscribeCallback;
      const mockSubscribe = jest.fn((callbacks) => {
        subscribeCallback = callbacks;
        return { unsubscribe: jest.fn() };
      });

      mockGraphqlFn.mockReturnValue({
        subscribe: mockSubscribe
      });

      const onUpdate = jest.fn();

      await notificationService.subscribeToNotificationUpdates(
        'notification-123',
        onUpdate
      );

      // Simula atualização de notificação
      subscribeCallback.next({
        data: {
          onUpdateNotification: mockNotification
        }
      });

      expect(onUpdate).toHaveBeenCalledWith(mockNotification);
    });

    test('deve chamar callback onError quando ocorre erro na subscrição de atualizações', async () => {
      const mockError = new Error('Update subscription error');

      let subscribeCallback;
      const mockSubscribe = jest.fn((callbacks) => {
        subscribeCallback = callbacks;
        return { unsubscribe: jest.fn() };
      });

      mockGraphqlFn.mockReturnValue({
        subscribe: mockSubscribe
      });

      const onError = jest.fn();

      await notificationService.subscribeToNotificationUpdates(
        'notification-123',
        jest.fn(),
        onError
      );

      // Simula erro na subscrição
      subscribeCallback.error(mockError);

      expect(onError).toHaveBeenCalledWith(mockError);
    });

    test('deve tratar erro ao criar subscrição de atualizações', async () => {
      const mockError = new Error('Setup error');
      mockGraphqlFn.mockImplementation(() => {
        throw mockError;
      });

      const onError = jest.fn();

      await expect(
        notificationService.subscribeToNotificationUpdates('notification-123', jest.fn(), onError)
      ).rejects.toThrow('Setup error');
    });
  });
});

