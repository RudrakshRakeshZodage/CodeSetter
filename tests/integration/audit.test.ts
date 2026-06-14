import { describe, it, expect } from 'vitest';
import path from 'path';
import { auditProject } from '../../src/index.js';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

describe('auditProject (integration)', () => {
  it('should return a complete AuditReport', async () => {
    const report = await auditProject(FIXTURES_DIR);

    expect(report).toBeDefined();
    expect(report.id).toBeTruthy();
    expect(report.timestamp).toBeTruthy();
    expect(report.version).toBe('1.0.0');
    expect(report.path).toBe(FIXTURES_DIR);
  }, 60000);

  it('should have a score between 0 and 100', async () => {
    const report = await auditProject(FIXTURES_DIR);
    expect(report.score.overall).toBeGreaterThanOrEqual(0);
    expect(report.score.overall).toBeLessThanOrEqual(100);
  }, 60000);

  it('should detect stack information', async () => {
    const report = await auditProject(FIXTURES_DIR);
    expect(report.stack).toBeDefined();
    expect(['javascript', 'typescript', 'react', 'nextjs', 'node', 'unknown']).toContain(
      report.stack.primary
    );
  }, 60000);

  it('should include results from multiple scanners', async () => {
    const report = await auditProject(FIXTURES_DIR);
    expect(report.results.length).toBeGreaterThan(0);
  }, 60000);

  it('should include a summary with total issue count', async () => {
    const report = await auditProject(FIXTURES_DIR);
    expect(report.summary.totalIssues).toBeGreaterThanOrEqual(0);
    expect(typeof report.summary.totalFiles).toBe('number');
  }, 60000);

  it('should detect critical security issues in fixtures', async () => {
    const report = await auditProject(FIXTURES_DIR);
    // Fixtures have hardcoded secrets → should have critical issues
    expect(report.summary.criticalIssues).toBeGreaterThan(0);
  }, 60000);

  it('should respect ignore patterns', async () => {
    const report1 = await auditProject(FIXTURES_DIR);
    const report2 = await auditProject(FIXTURES_DIR, {
      ignore: ['**/*.ts', '**/*.tsx'],
    });

    // Ignoring all TS files should drastically reduce issues
    expect(report2.summary.totalIssues).toBeLessThan(report1.summary.totalIssues);
  }, 60000);
});
