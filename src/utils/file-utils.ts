import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

/**
 * Read a file safely, returning null if it doesn't exist or can't be read.
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve path relative to CWD if not absolute.
 */
export function resolvePath(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

/**
 * Get all files in a directory matching patterns.
 */
export async function getFiles(
  dir: string,
  patterns: string[] = ['**/*.{ts,tsx,js,jsx,vue}'],
  ignore: string[] = []
): Promise<string[]> {
  const defaultIgnore = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.codesetter/**',
    '**/*.min.js',
    '**/*.bundle.js',
    ...ignore,
  ];

  const results: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: dir,
      absolute: true,
      ignore: defaultIgnore,
    });
    results.push(...files);
  }

  // Deduplicate
  return [...new Set(results)];
}

/**
 * Get only source (non-test) files.
 */
export async function getSourceFiles(dir: string, ignore: string[] = []): Promise<string[]> {
  return getFiles(
    dir,
    ['**/*.{ts,tsx,js,jsx}'],
    [
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/tests/**',
      '**/*.stories.*',
      ...ignore,
    ]
  );
}

/**
 * Get test files only.
 */
export async function getTestFiles(dir: string): Promise<string[]> {
  return getFiles(dir, [
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
  ]);
}

/**
 * Count lines in a string.
 */
export function countLines(content: string): number {
  return content.split('\n').length;
}

/**
 * Get file size in bytes.
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

/**
 * Read and parse JSON file safely.
 */
export async function readJsonFile<T = Record<string, unknown>>(filePath: string): Promise<T | null> {
  const content = await readFileSafe(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Ensure a directory exists.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Write a file, creating parent directories as needed.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Get relative path from base.
 */
export function relativePath(filePath: string, base: string): string {
  return path.relative(base, filePath).replace(/\\/g, '/');
}

/**
 * Get file extension without dot.
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).slice(1).toLowerCase();
}
