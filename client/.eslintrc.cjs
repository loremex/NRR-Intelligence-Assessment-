module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '*.config.js', '*.config.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'jsx-a11y'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // Aria-label on non-interactive divs (HeadlineTile uses role-less div for display)
    'jsx-a11y/no-static-element-interactions': 'off',
  },
}
