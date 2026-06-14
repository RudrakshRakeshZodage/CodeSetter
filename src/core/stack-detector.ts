import path from 'path';
import { StackInfo, DetectedStack } from '../types/index.js';
import { readJsonFile, fileExists } from '../utils/file-utils.js';
import { glob } from 'glob';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string };
  scripts?: Record<string, string>;
}

/**
 * Detect the primary tech stack of a project by analysing package.json
 * and file patterns in the given directory.
 */
export async function detectStack(dir: string): Promise<StackInfo> {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = await readJsonFile<PackageJson>(pkgPath);

  const allDeps: Record<string, string> = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };

  const depNames = Object.keys(allDeps);

  const hasDep = (...names: string[]): boolean => names.some((n) => depNames.includes(n));

  // ─── Framework detection ────────────────────────────────────────────────

  const frameworks: string[] = [];
  let primary: DetectedStack = 'javascript';
  const secondary: DetectedStack[] = [];

  // TypeScript
  const hasTypeScript = hasDep('typescript') || (await hasFiles(dir, ['**/*.ts', '**/*.tsx']));
  if (hasTypeScript) {
    primary = 'typescript';
  }

  // Next.js (before React, because it includes React)
  if (hasDep('next')) {
    primary = 'nextjs';
    frameworks.push('Next.js');
    secondary.push('react');
  }
  // React
  else if (hasDep('react', 'react-dom')) {
    if (primary !== 'nextjs') primary = 'react';
    frameworks.push('React');
  }
  // Vue
  else if (hasDep('vue', '@vue/core')) {
    primary = 'vue';
    frameworks.push('Vue');
  }
  // Angular
  else if (hasDep('@angular/core')) {
    primary = 'angular';
    frameworks.push('Angular');
  }
  // NestJS
  else if (hasDep('@nestjs/core', '@nestjs/common')) {
    primary = 'nestjs';
    frameworks.push('NestJS');
    secondary.push('node');
  }
  // Express
  else if (hasDep('express')) {
    primary = 'express' as DetectedStack;
    frameworks.push('Express');
    secondary.push('node');
  }
  // Node.js
  else if (hasDep('fastify', 'koa', 'hapi', '@hapi/hapi') || (await fileExists(path.join(dir, 'server.js'))) || (await fileExists(path.join(dir, 'app.js')))) {
    primary = 'node';
    frameworks.push('Node.js');
  }

  if (hasTypeScript && primary !== 'typescript') {
    secondary.push('typescript');
  }

  // ─── Test frameworks ─────────────────────────────────────────────────────

  const testFrameworks: string[] = [];
  if (hasDep('jest', '@jest/core', 'jest-cli')) testFrameworks.push('Jest');
  if (hasDep('vitest')) testFrameworks.push('Vitest');
  if (hasDep('mocha')) testFrameworks.push('Mocha');
  if (hasDep('@testing-library/react', '@testing-library/vue')) testFrameworks.push('Testing Library');
  if (hasDep('cypress')) testFrameworks.push('Cypress');
  if (hasDep('playwright', '@playwright/test')) testFrameworks.push('Playwright');

  // ─── Build tools ─────────────────────────────────────────────────────────

  const buildTools: string[] = [];
  if (hasDep('webpack', 'webpack-cli')) buildTools.push('Webpack');
  if (hasDep('vite', '@vitejs/plugin-react')) buildTools.push('Vite');
  if (hasDep('rollup')) buildTools.push('Rollup');
  if (hasDep('tsup')) buildTools.push('tsup');
  if (hasDep('esbuild')) buildTools.push('esbuild');
  if (hasDep('turbo')) buildTools.push('Turborepo');

  // ─── Package manager ─────────────────────────────────────────────────────

  let packageManager: StackInfo['packageManager'] = 'npm';
  if (await fileExists(path.join(dir, 'yarn.lock'))) packageManager = 'yarn';
  else if (await fileExists(path.join(dir, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (await fileExists(path.join(dir, 'bun.lockb'))) packageManager = 'bun';

  // ─── Has tests ───────────────────────────────────────────────────────────

  const hasTests =
    testFrameworks.length > 0 ||
    (await hasFiles(dir, ['**/*.test.*', '**/*.spec.*', '**/__tests__/**']));

  return {
    primary,
    secondary: [...new Set(secondary)],
    hasTypeScript,
    hasTests,
    packageManager,
    nodeVersion: pkg?.engines?.node,
    frameworks,
    testFrameworks,
    buildTools,
  };
}

async function hasFiles(dir: string, patterns: string[]): Promise<boolean> {
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: dir,
      ignore: ['**/node_modules/**'],
      nodir: true,
    });
    if (files.length > 0) return true;
  }
  return false;
}
