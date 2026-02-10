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
  mutation MarkAsRead($userId: ID!, $timestamp: String!) {
    markAsRead(userId: $userId, timestamp: $timestamp) {
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

// Serviço de notificações
export const notificationService = {
  // Busca notificações do usuário atual
  getNotifications: async (limit = 20, isRead = null) => {
    try {
      const user = await getCurrentUser();
      const userId = user.userId;

      const variables = {
        userId,
        limit,
        sortDirection: 'DESC'
      };

      if (isRead !== null) {
        variables.isRead = isRead;
      }

      const result = await client.graphql({
        query: getNotificationsByUser,
        variables,
        authMode: 'iam'
      });

      return result.data.getNotificationsByUser;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  },

  // Marca notificação como lida
  markAsRead: async (userId, timestamp) => {
    try {
      const result = await client.graphql({
        query: markAsRead,
        variables: {
          userId,
          timestamp
        },
        authMode: 'iam'
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
      const user = await getCurrentUser();
      const userId = user.userId;

      const subscription = client.graphql({
        query: onCreateNotification,
        variables: { userId },
        authMode: 'iam'
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
  }
};

