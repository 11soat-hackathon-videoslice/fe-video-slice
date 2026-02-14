# Correção - Notificações Duplicadas

## Problema Identificado

```
Warning: Encountered two children with the same key, `848834a8-20e1-7004-ee3b-4ba1495239d8-2026-02-10T19:53:00Z`. 
Keys should be unique so that components maintain their identity across updates.
```

### Causa

1. **Chave não-única**: A chave era gerada como `${notification.userId}-${notification.timestamp}`, mas notificações com mesmo userId e timestamp resultavam na mesma chave
2. **Duplicatas na subscription**: A mesma notificação podia chegar múltiplas vezes via subscription sem validação

## Solução Implementada

### 1. Alteração da Chave (Linha 248)

**Antes:**
```javascript
key={`${notification.userId}-${notification.timestamp}`}
```

**Depois:**
```javascript
key={notification.id}
```

O `id` é único para cada notificação, garantindo chaves únicas no React.

### 2. Validação de Duplicatas na Subscription (Linhas 68-77)

**Adicionado:**
```javascript
setNotifications(prev => {
  // Verifica se a notificação já existe para evitar duplicatas
  const notificationExists = prev.some(n => n.id === newNotification.id);
  if (notificationExists) {
    console.log('Notificação duplicada ignorada:', newNotification.id);
    return prev;
  }
  const updated = [newNotification, ...prev];
  updateUnreadCount(updated);
  return updated;
});
```

Esta validação:
- ✅ Verifica se a notificação já existe na lista
- ✅ Ignora duplicatas
- ✅ Evita que a mesma notificação seja renderizada duas vezes
- ✅ Registra no console quando uma duplicata é ignorada

## Teste Adicionado

Novo teste `deve ignorar notificações duplicadas via subscrição`:
```javascript
// Simula a mesma notificação chegando duas vezes
subscriptionCallback(newNotification);
subscriptionCallback(newNotification); // Segunda vez - deve ser ignorada

// Verifica que a notificação aparece apenas uma vez
const notifications = screen.getAllByText('Nova notificação');
expect(notifications).toHaveLength(1);
```

## Resultado

✅ **Problema Resolvido:**
- Chaves únicas para cada notificação (usando `id`)
- Notificações duplicadas são ignoradas
- React renderiza corretamente sem avisos
- Comportamento consistente e previsível

## Logs de Debug

Quando uma duplicata é ignorada, você verá no console:
```
Notificação duplicada ignorada: 004b1cc7-5f6d-45d0-8bcc-73b5c863052b
```

## Arquivos Modificados

1. **NotificationIcon.js**
   - Alterada chave do map (linha 248)
   - Adicionada validação de duplicatas (linhas 68-77)

2. **NotificationIcon.test.js**
   - Adicionado teste de duplicatas

## Como Funciona Agora

```
Backend envia notificação (id: "abc123")
↓
Frontend recebe via subscription
↓
Verifica se id "abc123" já existe?
├─ SIM → Ignora (console: "Notificação duplicada ignorada: abc123")
└─ NÃO → Adiciona à lista e renderiza
```

---

**Status**: ✅ Corrigido
**Impacto**: Mínimo - apenas otimização interna
**Breaking Changes**: Nenhum

