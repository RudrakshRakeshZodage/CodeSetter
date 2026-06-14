import { glob } from 'glob';
import path from 'path';

export interface WalkerOptions {
  extensions?: string[];
  ignore?: string[];
  includeTests?: boolean;
}

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/.codesetter/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.bundle.js',
  '**/.git/**',
  '**/vendor/**',
  '**/__pycache__/**',
];

/**
 * Walk a directory and return all matching source files.
 */
export async function walkFiles(dir: string, options: WalkerOptions = {}): Promise<string[]> {
  const {
    extensions = ['ts', 'tsx', 'js', 'jsx', 'vue', 'mjs', 'cjs'],
    ignore = [],
    includeTests = true,
  } = options;

  const testIgnore = includeTests
    ? []
    : ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/tests/**'];

  const pattern = `**/*.{${extensions.join(',')}}`;

  const files = await glob(pattern, {
    cwd: dir,
    absolute: true,
    ignore: [...DEFAULT_IGNORE, ...testIgnore, ...ignore],
  });

  return files.sort();
}

/**
 * Walk only HTML/template files.
 */
export async function walkTemplateFiles(dir: string, ignore: string[] = []): Promise<string[]> {
  return glob('**/*.{html,htm,vue,svelte}', {
    cwd: dir,
    absolute: true,
    ignore: [...DEFAULT_IGNORE, ...ignore],
  });
}

/**
 * Get all test files.
 */
export async function walkTestFiles(dir: string): Promise<string[]> {
  return glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
    cwd: dir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  });
}

/**
 * Infer the corresponding test file path for a source file.
 */
export function inferTestFilePath(sourceFile: string): string[] {
  const ext = path.extname(sourceFile);
  const base = sourceFile.slice(0, -ext.length);
  const dir = path.dirname(sourceFile);
  const name = path.basename(base);

  return [
    `${base}.test${ext}`,
    `${base}.spec${ext}`,
    path.join(dir, '__tests__', `${name}.test${ext}`),
    path.join(dir, '__tests__', `${name}.spec${ext}`),
    path.join(dir, 'tests', `${name}.test${ext}`),
  ];
}
