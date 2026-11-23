/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: { '^.+\.ts$': ['ts-jest', { diagnostics: false }] }, // tipos são checados por `npm run typecheck`
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  testTimeout: 30000,
  // Cobertura (npm run test:cobertura): só o código da aplicação; processos de entrada ficam de fora
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/worker.ts', '!src/types/**'],
  coverageReporters: ['text-summary', 'text', 'html', 'json-summary'],
  coverageDirectory: 'coverage',
};
