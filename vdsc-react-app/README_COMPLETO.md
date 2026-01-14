# Video Slice Dashboard - Frontend Application

## 📋 Descrição

Aplicação web React para gerenciamento de vídeos com processamento de slices. Permite upload, visualização e gerenciamento de vídeos com configurações personalizadas de processamento.

## 🚀 Tecnologias

- **React 19** (create-react-app, sem Vite)
- **AWS Amplify Gen2** - Gerenciamento de autenticação e configuração
- **AWS Cognito** - Autenticação de usuários
- **API Gateway** - Comunicação com backend
- **DynamoDB** - Armazenamento de metadados
- **S3** - Armazenamento de vídeos (via URLs pré-assinadas)
- **Axios** - Cliente HTTP

## 📁 Estrutura do Projeto

```
vdsc-react-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── ForgotPassword.js
│   │   │   └── Auth.css
│   │   └── Dashboard/
│   │       ├── Dashboard.js
│   │       ├── VideoTable.js
│   │       ├── UploadModal.js
│   │       └── Dashboard.css
│   ├── config/
│   │   └── aws-config.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── .env.example
├── package.json
└── README.md
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais AWS:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# AWS Cognito Configuration
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# API Gateway Configuration
REACT_APP_API_GATEWAY_URL=https://xxxxxxxx.execute-api.us-east-1.amazonaws.com/prod

# DynamoDB Configuration
REACT_APP_DYNAMODB_TABLE_NAME=VideoSlice
```

### 2. Instalação de Dependências

```bash
npm install
```

### 3. Executar em Desenvolvimento

```bash
npm start
```

A aplicação estará disponível em `http://localhost:3000`

### 4. Build para Produção

```bash
npm run build
```

## 🔧 Configuração AWS

### Cognito User Pool

1. Crie um User Pool no AWS Cognito
2. Configure:
   - **Sign-in options**: Email
   - **Password policy**: Mínimo 8 caracteres, maiúsculas, minúsculas, números e caracteres especiais
   - **Required attributes**: name, email
   - **Email verification**: Ativado
3. Crie um App Client (sem client secret)
4. Copie o User Pool ID e Client ID para o `.env`

### API Gateway

1. Crie uma API REST no API Gateway
2. Configure os seguintes endpoints:

#### Endpoints Necessários

**GET /videos**
- Retorna lista de vídeos do usuário autenticado
- Autorização: Cognito User Pool

**GET /videos/{id}**
- Retorna detalhes de um vídeo específico
- Autorização: Cognito User Pool

**POST /videos**
- Cria novo registro de vídeo
- Body: Metadados do vídeo
- Autorização: Cognito User Pool

**PUT /videos/{id}**
- Atualiza metadados do vídeo
- Autorização: Cognito User Pool

**DELETE /videos/{id}**
- Remove vídeo
- Autorização: Cognito User Pool

**POST /videos/upload-url**
- Retorna URL pré-assinada para upload
- Body: `{ "fileName": "string", "fileType": "string" }`
- Response: `{ "uploadUrl": "string", "videoId": "number" }`
- Autorização: Cognito User Pool

**GET /videos/{id}/download-url**
- Retorna URL pré-assinada para download
- Response: `{ "url": "string" }`
- Autorização: Cognito User Pool

**GET /videos/check/{fileName}**
- Verifica se arquivo já existe
- Response: `{ "exists": boolean }`
- Autorização: Cognito User Pool

### DynamoDB

A tabela `VideoSlice` deve ter a seguinte estrutura:

**Primary Key**: `id` (Number)

**Atributos**:
```json
{
  "id": 123,
  "userId": "string",
  "fileName": "string",
  "fileSize": 123456789,
  "duration": 120.5,
  "uploadDate": "2026-01-14T12:00:00.000Z",
  "status": "pending|processing|completed|failed",
  "timeUnit": "seconds|milliseconds",
  "startTime": 0,
  "endTime": 120,
  "interval": "5" ou "10,20,30",
  "quality": "low|medium|high",
  "maxRetries": 3,
  "retries": 0,
  "extension": "mp4"
}
```

## 🎨 Funcionalidades

### Autenticação

- ✅ Login com email e senha
- ✅ Cadastro de novos usuários (nome, email, senha)
- ✅ Confirmação de email via código
- ✅ Recuperação de senha
- ✅ Validação de senha forte (8+ caracteres, maiúsculas, minúsculas, números, especiais)
- ✅ Auto sign-in após confirmação

### Dashboard

- ✅ Visualização de vídeos em tabela
- ✅ Ordenação por todas as colunas
- ✅ Colunas de Identificação:
  - ID, Nome, Data de Upload, Tamanho, Duração, Status
- ✅ Colunas de Processamento:
  - Unidade de tempo, Tempo inicial, Tempo final, Intervalo, Qualidade, Máx. Retentativas, Retentativas
- ✅ Botões de ação:
  - Download (via URL pré-assinada)
  - Logs (preparado para implementação futura)
- ✅ Atualização manual da lista
- ✅ Design responsivo

### Upload de Vídeos

- ✅ Drag-and-drop de arquivos
- ✅ Validação de formato (mp4, avi, mov, mkv, webm)
- ✅ Validação de tamanho (máx 500MB)
- ✅ Extração automática de metadados do vídeo
- ✅ Configurações de processamento:
  - Nome do arquivo (com validação de duplicidade)
  - Unidade de tempo (segundos/milissegundos)
  - Tempo inicial e final
  - Intervalo (valor único ou múltiplos valores)
  - Qualidade
  - Máximo de retentativas
- ✅ Validações em tempo real
- ✅ Conversão automática de unidades
- ✅ Barra de progresso de upload
- ✅ Upload para S3 via URL pré-assinada
- ✅ Envio de metadados para DynamoDB

## 📝 Validações Implementadas

### Upload de Vídeo

1. **Nome do arquivo**: Obrigatório, verificação de duplicidade
2. **Tempo inicial**: Não pode ser negativo, deve ser menor que duração e tempo final
3. **Tempo final**: Deve ser maior que tempo inicial, não pode exceder duração
4. **Intervalo**: 
   - Formato único: número positivo (ex: "5")
   - Formato múltiplo: números separados por vírgula (ex: "10,20,30")
   - Valores múltiplos devem estar entre tempo inicial e final
5. **Formato**: Apenas vídeos nos formatos permitidos
6. **Tamanho**: Máximo 500MB

## 🚀 Deploy no AWS Amplify

### Opção 1: Deploy via Console

1. Acesse AWS Amplify Console
2. Clique em "New app" → "Host web app"
3. Conecte seu repositório Git
4. Configure:
   - Branch: main (ou sua branch)
   - Build settings: Detectado automaticamente
   - Environment variables: Adicione as variáveis do `.env`
5. Clique em "Save and deploy"

### Opção 2: Deploy via CLI

```bash
# Instalar Amplify CLI
npm install -g @aws-amplify/cli

# Configurar Amplify
amplify configure

# Inicializar projeto
amplify init

# Adicionar hosting
amplify add hosting

# Publicar
amplify publish
```

### Build Settings (amplify.yml)

Crie o arquivo `amplify.yml` na raiz do projeto:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd fe-video-slice/vdsc-react-app
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: fe-video-slice/vdsc-react-app/build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## 🔒 Segurança

- ✅ Autenticação via AWS Cognito
- ✅ Tokens JWT em requisições
- ✅ URLs pré-assinadas para upload/download
- ✅ Validação no frontend e backend
- ✅ Variáveis de ambiente para credenciais
- ✅ HTTPS em produção

## 🐛 Troubleshooting

### Erro de autenticação
- Verifique se as credenciais Cognito estão corretas no `.env`
- Confirme que o User Pool está ativo
- Verifique se o App Client não requer client secret

### Erro de CORS
- Configure CORS no API Gateway
- Permita origins: `http://localhost:3000` e seu domínio de produção

### Vídeos não aparecem
- Verifique logs do console do navegador
- Confirme que o endpoint GET /videos está retornando dados
- Verifique autenticação do usuário

### Upload falha
- Verifique tamanho e formato do arquivo
- Confirme que a URL pré-assinada foi gerada corretamente
- Verifique permissões do bucket S3

## 📚 Próximas Implementações

- [ ] Visualização de logs detalhados
- [ ] Download de vídeos processados
- [ ] Preview de frames extraídos
- [ ] Filtros e busca na tabela
- [ ] Paginação
- [ ] Notificações em tempo real
- [ ] Dark mode

## 📄 Licença

Este projeto é parte do trabalho acadêmico FIAP - Pós Tech 11SOAT.

## 👨‍💻 Suporte

Para dúvidas e suporte, consulte a documentação da AWS ou entre em contato com a equipe de desenvolvimento.
