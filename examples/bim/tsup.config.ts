import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['esm'],
  entry: {
    'core/index': 'src/core/index.ts',
    'schema/index': 'src/schema/index.ts',
    'converter/index': 'src/converter/index.ts',
    'viewer/index': 'src/viewer/index.ts',
    'react/index': 'src/react/index.ts',
    'react/BimCanvas': 'src/react/BimCanvas.tsx',
    'dtaas/index': 'src/dtaas/index.ts',
  },
  target: 'es2022',
  dts: false,
  clean: true,
  splitting: true,
  treeshake: true,
});
