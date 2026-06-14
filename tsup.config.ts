import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'scanners/index': 'src/scanners/index.ts',
      'ai/index': 'src/ai/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    target: 'node18',
    platform: 'node',
    shims: true,
    treeshake: true,
    minify: false,
    esbuildOptions(options) {
      options.banner = {};
    },
  },
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    outDir: 'dist',
    target: 'node18',
    platform: 'node',
    shims: true,
    treeshake: true,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
