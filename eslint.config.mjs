import jsxA11Y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import jest from 'eslint-plugin-jest';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const compat = new FlatCompat({
  baseDirectory: dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const restrictedGlobal = {
  name: 'global',
  message:
    "Use 'globalThis' instead of 'global' for cross-platform compatibility.",
};

export default [
  {
    ignores: [
      '**/coverage/',
      '**/*.d.ts',
      '**/dist/',
      '**/node_modules/',
      'docs/visualization/',
    ],
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:react/recommended',
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ),
  reactHooksPlugin.configs.flat['recommended-latest'],
  {
    plugins: {
      'jsx-a11y': jsxA11Y,
      react,
      jest,
      '@typescript-eslint': typescriptEslint,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
        ...jest.environments.globals.globals,
      },
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        requireConfigFile: false,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: '19.2.0',
      },
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx'],
        },
      },
    },

    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      'class-methods-use-this': 'off',
      'no-underscore-dangle': 'off',
      'no-param-reassign': 'off',
      'global-require': 'off',
      'vars-on-top': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-console': 'error',
      'react/prop-types': 'off',
      'linebreak-style': 0,
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'no-use-before-define': 'off',
      'no-unreachable': 'error',

      // Conflict with SonarCube fixes
      'consistent-return': 'off',
      'no-restricted-syntax': 'off',

      // Not needed with React 17+ new JSX transform
      'react/react-in-jsx-scope': 'off',

      // SonarCube based rules
      'no-restricted-globals': ['error', restrictedGlobal],
      'no-restricted-imports': [
        'error',
        {
          paths: ['util', 'path', 'fs'].map((name) => ({
            name,
            message: `Use 'node:${name}' instead of '${name}' to explicitly import Node.js built-in modules.`,
          })),
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        requireConfigFile: false,
        project: [path.join(dirname, 'tsconfig.eslint.json')],
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
  },
  {
    files: ['**/*.slice.ts'],
    rules: {
      'no-param-reassign': ['error', { props: false }],
    },
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      'no-restricted-globals': [
        'error',
        restrictedGlobal,
        {
          name: 'window',
          message:
            "Use 'globalThis' instead of 'window' for cross-platform compatibility in tests.",
        },
      ],
    },
  },
];
