import tseslint from 'typescript-eslint';

/**
 * Lint do backend com foco numa regra do projeto: nenhum valor do tipo `any`.
 *
 * - Em TODO o código (inclusive os testes): proíbe o `any` escrito no código.
 * - No código de produção (src, scripts, prisma, api): proíbe também o `any` que entra por inferência,
 *   como o resultado de JSON.parse ou um dado vindo de uma biblioteca mal tipada. Esses valores precisam
 *   ser tratados como `unknown` e conferidos antes do uso.
 * - Nos testes, o `res.body` do supertest é tipado como `any` pela própria biblioteca; por isso as regras
 *   de inferência não valem lá.
 */
const base = {
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: import.meta.dirname },
  },
  plugins: { '@typescript-eslint': tseslint.plugin },
};

export default [
  { ignores: ['dist/**', 'coverage/**', 'uploads/**', 'uploads-test/**', 'node_modules/**', 'tests/carga/**'] },
  { ...base, files: ['**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  {
    ...base,
    files: ['src/**/*.ts', 'scripts/**/*.ts', 'prisma/**/*.ts', 'api/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
    },
  },
];
