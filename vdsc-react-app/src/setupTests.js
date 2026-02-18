// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock AWS Amplify Auth
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  confirmSignUp: jest.fn(),
  autoSignIn: jest.fn(),
  signOut: jest.fn(),
  fetchUserAttributes: jest.fn(),
  fetchAuthSession: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
}));

// Mock config
jest.mock('./config/aws-config', () => ({
  amplifyConfig: {
    Auth: {
      Cognito: {
        userPoolId: 'test-pool-id',
        userPoolClientId: 'test-client-id',
      }
    }
  },
  apiConfig: {
    baseURL: 'http://test-api.com',
    region: 'us-east-1',
    tableName: 'VideoSlice',
    apiUrl: 'http://test-api.com',
    apiListByUserId: '/videos/list/userId',
    apiUploadUrl: '/video/upload/url',
    apiDownloadUrl: '/video/download/url',
    apiUploadMetadata: '/video/upload',
  }
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

// Mock window.alert
global.alert = jest.fn();

// Mock HTMLVideoElement
Object.defineProperty(window.HTMLVideoElement.prototype, 'load', {
  value: jest.fn(),
});
Object.defineProperty(window.HTMLVideoElement.prototype, 'play', {
  value: jest.fn(),
});
Object.defineProperty(window.HTMLVideoElement.prototype, 'pause', {
  value: jest.fn(),
});

