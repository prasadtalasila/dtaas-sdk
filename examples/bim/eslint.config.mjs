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
// The SDK's kit config only resolves after `yarn sdk` unpacks the built
// package into node_modules; it is an ordinary dependency import here,
// unlike the SDK repo's own config which reads its in-tree src/eslint.
import dtaasKitConfig from '@into-cps-association/dtaas-sdk/eslint';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: configDirectory,
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
      'dist/',
      'coverage/',
      'node_modules/',
      'src/converter/generated/',
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
        project: ['./tsconfig.eslint.json'],
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
  },
  {
    // AGENTS.md: functions stay under 25 lines and files under 250 lines.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 25 }],
      'max-lines': ['error', { max: 250 }],
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
  // The bim example obeys the same rules the SDK asks of every kit.
  ...dtaasKitConfig.map((config) => ({
    ...config,
    files: ['src/**/*.{ts,tsx}'],
  })),
];
