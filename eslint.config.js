import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    {
        files: ['content/**/*.js', 'popup/**/*.js', 'shared/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: { ...globals.browser, chrome: 'readonly' },
        },
    },
    {
        files: ['test/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: { ...globals.node, ...globals.browser },
        },
    },
    {
        files: ['scripts/**/*.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: { ...globals.node },
        },
    },
    {
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            'prefer-const': 'error',
            eqeqeq: ['error', 'smart'],
        },
    },
];
