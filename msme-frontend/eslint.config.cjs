// ESLint 9 flat config for the React app.

const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const prettier = require('eslint-config-prettier')

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  fetch: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  location: 'readonly',
  history: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  FileReader: 'readonly',
  Image: 'readonly',
  URL: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  IntersectionObserver: 'readonly',
  HTMLElement: 'readonly',
  AbortController: 'readonly',
  URLSearchParams: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  XMLHttpRequest: 'readonly',
  WebSocket: 'readonly',
  matchMedia: 'readonly',
  performance: 'readonly',
  screen: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
}

const serviceWorkerGlobals = {
  self: 'readonly',
  caches: 'readonly',
  fetch: 'readonly',
  console: 'readonly',
}

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'eslint.config.js'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: browserGlobals,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // core
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-redeclare': 'error',
      'no-const-assign': 'error',
      'no-constant-condition': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'error',
      'valid-typeof': 'error',
      'use-isnan': 'error',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
      'prefer-const': 'warn',

      // react
      'react/jsx-uses-react': 'off', // new JSX transform
      'react/react-in-jsx-scope': 'off', // new JSX transform
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/no-children-prop': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/prop-types': 'off',

      // hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: serviceWorkerGlobals,
    },
    rules: { 'no-undef': 'error' },
  },
  prettier,
]
