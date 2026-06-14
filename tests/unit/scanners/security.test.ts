import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { SecurityScanner } from '../../../src/scanners/security/security-scanner.js';
import { loadConfig } from '../../../src/core/config.js';

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');

describe('SecurityScanner', () => {
  let scanner: SecurityScanner;
  let config: Awaited<ReturnType<typeof loadConfig>>;

  beforeAll(async () => {
    scanner = new SecurityScanner();
    config = await loadConfig(FIXTURES_DIR);
  });

  it('should return category=security', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    expect(result.category).toBe('security');
  });

  it('should detect hardcoded Google API key', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const secretIssues = result.issues.filter((i) => i.rule === 'no-hardcoded-secrets');
    expect(secretIssues.length).toBeGreaterThan(0);
  });

  it('should detect unsafe eval() usage', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const evalIssues = result.issues.filter((i) => i.rule === 'no-eval');
    expect(evalIssues.length).toBeGreaterThan(0);
  });

  it('should detect XSS via innerHTML', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const xssIssues = result.issues.filter((i) => i.rule === 'no-xss');
    expect(xssIssues.length).toBeGreaterThan(0);
  });

  it('should detect SQL injection patterns', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const sqlIssues = result.issues.filter((i) => i.rule === 'no-sql-injection');
    expect(sqlIssues.length).toBeGreaterThan(0);
  });

  it('should return a score below 70 for files with many security issues', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    // Fixtures have multiple critical issues — score should be low
    expect(result.score).toBeLessThan(70);
  });

  it('all issues should have a fix suggestion', async () => {
    const result = await scanner.scan(FIXTURES_DIR, config);
    const issuesWithFix = result.issues.filter((i) => i.fix !== undefined);
    // At least 80% of security issues should have a fix
    expect(issuesWithFix.length / result.issues.length).toBeGreaterThan(0.8);
  });
});
