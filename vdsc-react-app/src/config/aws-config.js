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
  }
};

export const apiConfig = {
  baseURL: process.env.REACT_APP_API_GATEWAY_URL,
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  tableName: process.env.REACT_APP_DYNAMODB_TABLE_NAME || 'VideoSlice'
};
