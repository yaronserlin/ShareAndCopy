/**
 * Preview: client/.eslintrc.js
 * Description: Frontend application module.
 */

# ESLint Configuration

module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    rules: {
        
        'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
        'semi': ['error', 'always'],
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
};
