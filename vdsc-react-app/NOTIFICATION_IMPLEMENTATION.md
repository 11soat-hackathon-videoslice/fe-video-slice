# Implementação de Notificações - Documentação

## Resumo das Alterações

### 1. NotificationIcon.js
**Arquivo**: `src/components/Dashboard/NotificationIcon.js`

#### Funcionalidades Implementadas:
- ✅ **Carregamento de Notificações ao Montar**: O componente `NotificationIcon` chama `loadNotifications()` no `useEffect` quando monta
- ✅ **Filtro de Não Lidas**: Carrega apenas notificações não lidas (`isRead: false`)
- ✅ **Subscription de Novas Notificações**: Se inscreve em `onCreateNotification` para receber notificações em tempo real
- ✅ **Marcar como Lida**: Permite marcar notificações como lidas usando apenas o `id`
- ✅ **Callbacks para Dashboard**: 
  - `onNewNotification`: Notifica quando uma nova notificação chega
  - `onNotificationRead`: Notifica quando uma notificação é marcada como lida

#### Fluxo de Execução:
```
1. Dashboard carrega
2. NotificationIcon monta
3. useEffect dispara
4. loadNotifications() é chamado
5. getNotifications(20, false) executa a query GraphQL
6. Notificações não lidas são carregadas e exibidas
7. setupSubscription() cria listener para novas notificações
```

### 2. Dashboard.js
**Arquivo**: `src/components/Dashboard/Dashboard.js`

#### Funcionalidades Implementadas:
- ✅ **Handler de Nova Notificação**: `handleNewNotification()` - Atualiza tabela de vídeos quando notificação chega
- ✅ **Handler de Notificação Lida**: `handleNotificationRead()` - Callback quando notificação é marcada como lida
- ✅ **Integração com NotificationIcon**: Passa props `onNewNotification` e `onNotificationRead`

### 3. notificationService.js
**Arquivo**: `src/services/notificationService.js`

#### Métodos Implementados:

**getNotifications(limit = 20, isRead = null)**
- Executa a query `getNotificationsByUser` via GraphQL AppSync
- Parâmetros:
  - `limit`: Número máximo de notificações a buscar (padrão: 20)
  - `isRead`: Filtro de leitura (false para não lidas)
- Ordena por timestamp DESC (mais recentes primeiro)
- Inclui logs de debug para rastreamento
- Retorna: `{ items: [...], nextToken: null }`

**markAsRead(id)**
- Executa a mutation `markAsRead` via GraphQL AppSync
- Parâmetro: apenas o `id` da notificação
- Marca a notificação como lida automaticamente no backend
- Retorna: Notificação atualizada

**subscribeToNotifications(onNotification, onError)**
- Cria subscription em tempo real para novas notificações
- Listener automático para mudanças
- Chama callback quando nova notificação chega

**subscribeToNotificationUpdates(id, onUpdate, onError)**
- Cria subscription para atualizações de notificação específica
- Útil para sincronização em tempo real

### 4. Testes Atualizados
**Arquivos de Teste**:
- `src/services/notificationService.test.js`
- `src/components/Dashboard/NotificationIcon.test.js`
- `src/components/Dashboard/Dashboard.test.js`

#### Testes Adicionados:
- ✅ Teste de carregamento inicial de notificações
- ✅ Teste de callbacks `onNewNotification`
- ✅ Teste de callbacks `onNotificationRead`
- ✅ Teste de marcar como lida
- ✅ Teste de subscription ao montar

**Coverage**: 87.93% (acima do mínimo de 80%)

## Console Logs para Debug

Quando a página é carregada, você verá:

```
NotificationIcon: useEffect - Componente montado, chamando loadNotifications
NotificationIcon: Carregando notificações não lidas...
notificationService.getNotifications: Iniciando busca de notificações
notificationService.getNotifications: Chamando GraphQL - Usuário: <userId> isRead: false
notificationService.getNotifications: Sucesso! Notificações encontradas: <count>
NotificationIcon: Notificações carregadas: <count> notificações
```

## Fluxo Completo de Notificações

### 1️⃣ Carregamento Inicial (ao abrir dashboard)
```
Dashboard monta
  ↓
NotificationIcon monta
  ↓
useEffect dispara
  ↓
loadNotifications() executa
  ↓
notificationService.getNotifications(20, false)
  ↓
GraphQL: query getNotificationsByUser(userId, limit: 20, isRead: false)
  ↓
Notificações carregadas e exibidas
```

### 2️⃣ Nova Notificação (em tempo real)
```
Backend cria notificação
  ↓
AppSync emite onCreateNotification
  ↓
Subscription recebe evento
  ↓
setupSubscription callback dispara
  ↓
Estado atualizado (adiona nova notificação)
  ↓
onNewNotification() callback chamado
  ↓
Dashboard.handleNewNotification() executa
  ↓
loadVideos() recarrega tabela de vídeos
```

### 3️⃣ Marcar Como Lida
```
Usuário clica na notificação
  ↓
handleMarkAsRead() dispara
  ↓
notificationService.markAsRead(id)
  ↓
GraphQL: mutation markAsRead(id: ID!)
  ↓
Backend marca isRead = true
  ↓
Notificação atualizada localmente
  ↓
Badge atualizado
  ↓
onNotificationRead() callback chamado
```

## GraphQL Queries/Mutations

### Query: getNotificationsByUser
```graphql
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
```

### Mutation: markAsRead
```graphql
mutation MarkAsRead($id: ID!) {
  markAsRead(id: $id) {
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
```

### Subscription: onCreateNotification
```graphql
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
```

### Subscription: onUpdateNotification
```graphql
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
```

## Verificação

Para confirmar que está funcionando:

1. **Abra o browser DevTools** (F12)
2. **Vá para Console**
3. **Recarregue a página** (F5)
4. **Procure pelos logs:**
   - `NotificationIcon: useEffect - Componente montado, chamando loadNotifications`
   - `NotificationIcon: Carregando notificações não lidas...`
   - `notificationService.getNotifications: Iniciando busca de notificações`
   - `notificationService.getNotifications: Sucesso!`

Se ver esses logs, a chamada está funcionando corretamente! ✅

