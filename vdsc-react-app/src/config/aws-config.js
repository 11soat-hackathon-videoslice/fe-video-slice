// AWS Amplify Configuration
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
      loginWith: {
        email: true
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true
        },
        name: {
          required: true
        }
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true
      }
    }
  },
  API: {
    GraphQL: {
      endpoint: process.env.REACT_APP_APPSYNC_ENDPOINT,
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      defaultAuthMode: 'iam'
    }
  }
};

export const apiConfig = {
  baseURL: process.env.REACT_APP_API_GATEWAY_URL,
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  tableName: process.env.REACT_APP_DYNAMODB_TABLE_NAME || 'VideoSlice',
  apiUrl: process.env.REACT_APP_API_GATEWAY_URL,
  apiListByUserId: process.env.REACT_APP_API_LIST_BY_USER_ID || '/videos/list/userId',
  apiUploadUrl: process.env.REACT_APP_API_UPLOAD_URL || '/video/upload/url',
  apiDownloadUrl: process.env.REACT_APP_API_DOWNLOAD_URL || '/video/download/url',
  apiUploadMetadata: process.env.REACT_APP_API_UPLOAD_METADATA || '/video/upload'
};
