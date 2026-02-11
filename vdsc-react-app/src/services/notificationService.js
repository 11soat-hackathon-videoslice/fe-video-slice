import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

// Cria cliente GraphQL para AppSync
const client = generateClient();

// Query para buscar notificações do usuário
export const getNotificationsByUser = /* GraphQL */ `
  query GetNotificationsByUser(
    $userId: ID!
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
    $isRead: Boolean
  ) {
    getNotificationsByUser(
      userId: $userId
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
      isRead: $isRead
    ) {
      items {
        userId
        timestamp
        id
        message
        isRead
        videoId
        fileName
        extentisonFile
      }
      nextToken
    }
  }
`;

// Mutation para marcar notificação como lida
export const markAsRead = /* GraphQL */ `
  mutation MarkAsRead($id: ID!, $timestamp: String!) {
    markAsRead(id: $id, timestamp: $timestamp) {
      userId
      timestamp
      id
      message
      isRead
      videoId
      fileName
      extentisonFile
    }
  }
`;

// Subscription para novas notificações
export const onCreateNotification = /* GraphQL */ `
  subscription OnCreateNotification($userId: ID!) {
    onCreateNotification(userId: $userId) {
      userId
      timestamp
      id
      message
      isRead
      videoId
      fileName
      extentisonFile
    }
  }
`;

// Subscription para atualizações de notificações (marcar como lida)
export const onUpdateNotification = /* GraphQL */ `
  subscription OnUpdateNotification($id: ID!) {
    onUpdateNotification(id: $id) {
      userId
      timestamp
      id
      message
      isRead
      videoId
      fileName
      extentisonFile
    }
  }
`;

// Serviço de notificações
export const notificationService = {
  // Busca notificações do usuário atual
  getNotifications: async (limit = 20, isRead = null) => {
    try {
      console.log('notificationService.getNotifications: Iniciando busca de notificações');
      let user;

      try {
        user = await getCurrentUser();
      } catch (authError) {
        console.warn('notificationService.getNotifications: Usuário não autenticado ou sessão expirou', authError.message);
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      if (!user || !user.userId) {
        console.error('notificationService.getNotifications: Usuário não possui userId');
        throw new Error('Dados de usuário inválidos');
      }

      const userId = user.userId;

      const variables = {
        userId,
        limit,
        sortDirection: 'DESC'
      };

      if (isRead !== null) {
        variables.isRead = isRead;
      }

      console.log('notificationService.getNotifications: Chamando GraphQL - Usuário:', userId, 'isRead:', isRead);

      const result = await client.graphql({
        query: getNotificationsByUser,
        variables,
        authMode: 'userPool'
      });

      console.log('notificationService.getNotifications: Sucesso! Notificações encontradas:', result.data.getNotificationsByUser?.items?.length || 0);
      return result.data.getNotificationsByUser;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  },

  // Marca notificação como lida
  markAsRead: async (id,timestamp) => {
    try {
      const result = await client.graphql({
        query: markAsRead,
        variables: {
          id,
          timestamp
        },
        authMode: 'userPool'
      });

      return result.data.markAsRead;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  },

  // Cria subscrição para novas notificações
  subscribeToNotifications: async (onNotification, onError) => {
    try {
      let user;
      try {
        user = await getCurrentUser();
      } catch (authError) {
        console.warn('subscribeToNotifications: Usuário não autenticado', authError.message);
        throw new Error('Usuário não autenticado para subscrição de notificações');
      }

      if (!user || !user.userId) {
        throw new Error('Dados de usuário inválidos para subscrição');
      }

      const userId = user.userId;
      console.log('subscribeToNotifications: Criando subscrição para userId:', userId);

      const subscription = client.graphql({
        query: onCreateNotification,
        variables: { userId },
        authMode: 'userPool'
      }).subscribe({
        next: ({ data }) => {
          if (data?.onCreateNotification) {
            onNotification(data.onCreateNotification);
          }
        },
        error: (error) => {
          console.error('Erro na subscrição de notificações:', error);
          if (onError) {
            onError(error);
          }
        }
      });

      return subscription;
    } catch (error) {
      console.error('Erro ao criar subscrição:', error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  },

  // Cria subscrição para atualizações de notificações (markAsRead)
  subscribeToNotificationUpdates: async (id, onUpdate, onError) => {
    try {
      const subscription = client.graphql({
        query: onUpdateNotification,
        variables: { id },
        authMode: 'userPool'
      }).subscribe({
        next: ({ data }) => {
          if (data?.onUpdateNotification) {
            onUpdate(data.onUpdateNotification);
          }
        },
        error: (error) => {
          console.error('Erro na subscrição de atualizações:', error);
          if (onError) {
            onError(error);
          }
        }
      });

      return subscription;
    } catch (error) {
      console.error('Erro ao criar subscrição de atualizações:', error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }
};

