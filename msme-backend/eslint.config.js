// ESLint 10 flat config. Rules are listed explicitly rather than extending
// js.configs.recommended: ESLint 10 no longer bundles @eslint/js, and this
// keeps the config working without an extra dependency.

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  global: 'readonly',
}

const jestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
}

const coreRules = {
  'no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_|^next$',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  'no-undef': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-duplicate-case': 'error',
  'no-unreachable': 'error',
  'no-redeclare': 'error',
  'no-const-assign': 'error',
  'no-self-assign': 'error',
  'no-constant-condition': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-prototype-builtins': 'error',
  'no-useless-escape': 'error',
  'no-fallthrough': 'error',
  'valid-typeof': 'error',
  'use-isnan': 'error',
  eqeqeq: ['warn', 'smart'],
  'no-var': 'warn',
  'prefer-const': 'warn',
}

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'eslint.config.js'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: coreRules,
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...nodeGlobals, ...jestGlobals },
    },
  },
]
