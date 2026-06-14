import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { QualityScanner } from '../../../src/scanners/quality/quality-scanner.js';
import { loadConfig } from '../../../src/core/config.js';

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');

describe('QualityScanner', () => {
  let scanner: QualityScanner;
  let config: Awaited<ReturnType<typeof loadConfig>>;

  beforeAll(async () => {
    scanner = new QualityScanner();
    config = await loadConfig(FIXTURES_DIR);
  });

  it('should return a ScanResult with category=quality', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    expect(result.category).toBe('quality');
  });

  it('should return a numeric score between 0 and 100', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should detect console.log statements', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const consoleLogs = result.issues.filter((i) => i.rule === 'no-console');
    expect(consoleLogs.length).toBeGreaterThan(0);
  });

  it('should detect deeply nested code', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const nesting = result.issues.filter((i) => i.rule === 'max-depth');
    expect(nesting.length).toBeGreaterThan(0);
  });

  it('should have a duration in ms', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should report filesScanned > 0', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    expect(result.filesScanned).toBeGreaterThan(0);
  });

  it('should assign proper severity values', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const validSeverities = ['info', 'low', 'medium', 'high', 'critical'];
    for (const issue of result.issues) {
      expect(validSeverities).toContain(issue.severity);
    }
  });
});
