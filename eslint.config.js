import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// Type-aware linting: a transactional service lives and dies by its async edges (session writes,
// redirects, validation that must run before a POST mutates state), so floating/misused promises
// and unsafe `any` from request bodies are exactly what must fail the build — syntax-only linting
// would wave them through.
export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/', 'static/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Leading-underscore args are deliberately unused — notably Express's error-handling middleware,
      // which is only recognised as such when it declares all four parameters.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Plain-JS config files (this one, playwright.config is TS) have no type info.
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
)
