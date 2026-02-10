module.exports = {
  // Ambiente de teste
  testEnvironment: 'jsdom',

  // Padrão de testes
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}'
  ],

  // Módulos para setup antes de testes
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.js'
  ],

  // Transformadores
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.css$': 'jest-transform-css',
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': 'jest-transform-file'
  },

  // Módulos para transformação
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],

  // Cobertura de testes
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}'
  ],

  // Limiar de cobertura
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Configurações de reporte
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary'
  ],

  // Diretório de saída de cobertura
  coverageDirectory: '<rootDir>/coverage',

  // Formato de resultado de teste (junit para SonarQube)
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathAsClassName: true,
        suiteNameTemplate: '{filepath}',
        reportTestSuiteAsScrewtape: false,
        suiteName: 'Frontend Tests',
        addFileAttribute: true
      }
    ]
  ],

  // Aliases (caso use path mapping)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },

  // Ignorar certos padrões
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/'
  ],

  // Máximo de workers paralelos
  maxWorkers: '50%',

  // Timeout padrão
  testTimeout: 10000,

  // Verbose
  verbose: true,

  // Resetar mocks entre testes
  resetMocks: true,
  resetModules: true,

  // Limpar mocks entre testes
  clearMocks: true
};
