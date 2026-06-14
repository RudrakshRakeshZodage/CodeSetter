import { execSync } from 'child_process';
import { ScanResult, Issue, CodeSetterConfig } from '../../types/index.js';
import { walkFiles } from '../../core/file-walker.js';
import { readFileSafe, relativePath } from '../../utils/file-utils.js';
import {
  SECRET_PATTERNS,
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  UNSAFE_EVAL_PATTERNS,
} from '../../utils/regex-patterns.js';
import { logger } from '../../utils/logger.js';

export class SecurityScanner {
  async scan(dir: string, config: CodeSetterConfig): Promise<ScanResult> {
    const start = Date.now();
    const files = await walkFiles(dir, {
      extensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'env', 'yaml', 'yml'],
      ignore: config.ignore,
    });

    const issues: Issue[] = [];

    for (const file of files) {
      const content = await readFileSafe(file);
      if (!content) continue;

      // Skip obvious non-issues in lock files and minified files
      if (file.includes('.lock') || file.endsWith('.min.js')) continue;

      const relFile = relativePath(file, dir);
      const lines = content.split('\n');

      // ─── Secret detection ──────────────────────────────────────────────────
      for (const { name, pattern, severity } of SECRET_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip comments
          if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
          // Skip env example files
          if (file.includes('.env.example') || file.includes('.env.sample')) continue;

          if (pattern.test(line)) {
            issues.push({
              id: `security-secret-${name.replace(/\s/g, '-').toLowerCase()}-${relFile}-${i}`,
              category: 'security',
              severity,
              title: `Hardcoded ${name}`,
              description: `Potential hardcoded ${name} detected. Never commit credentials to source control.`,
              location: { file: relFile, line: i + 1 },
              rule: 'no-hardcoded-secrets',
              fix: {
                description: `Move to environment variable: process.env.${name.replace(/\s/g, '_').toUpperCase()}`,
                before: this.redactLine(line),
                after: `const value = process.env.${name.replace(/\s/g, '_').toUpperCase()} ?? '';`,
                automated: false,
              },
              effort: 'easy',
              impact: 'high',
              tags: ['secrets', 'credentials'],
              references: [
                'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
              ],
            });
          }
        }
      }

      // ─── SQL Injection ─────────────────────────────────────────────────────
      for (const pattern of SQL_INJECTION_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            issues.push({
              id: `security-sql-injection-${relFile}-${i}`,
              category: 'security',
              severity: 'critical',
              title: 'SQL Injection Risk',
              description: 'Dynamic SQL query constructed with user input. Use parameterized queries.',
              location: { file: relFile, line: i + 1 },
              rule: 'no-sql-injection',
              fix: {
                description: 'Use parameterized queries or an ORM',
                before: lines[i].trim(),
                after: `db.query('SELECT * FROM users WHERE id = ?', [userId])`,
                automated: false,
              },
              effort: 'medium',
              impact: 'high',
              references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
            });
          }
        }
      }

      // ─── XSS ──────────────────────────────────────────────────────────────
      for (const pattern of XSS_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            issues.push({
              id: `security-xss-${relFile}-${i}`,
              category: 'security',
              severity: 'high',
              title: 'XSS Risk',
              description: 'Unsanitized HTML injection detected.',
              location: { file: relFile, line: i + 1 },
              rule: 'no-xss',
              fix: {
                description: 'Use DOMPurify or textContent instead of innerHTML',
                before: lines[i].trim(),
                after: `element.textContent = userInput; // or DOMPurify.sanitize(input)`,
                automated: false,
              },
              effort: 'medium',
              impact: 'high',
              references: ['https://owasp.org/www-community/attacks/xss/'],
            });
          }
        }
      }

      // ─── Command Injection ────────────────────────────────────────────────
      for (const pattern of COMMAND_INJECTION_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            issues.push({
              id: `security-cmd-injection-${relFile}-${i}`,
              category: 'security',
              severity: 'critical',
              title: 'Command Injection Risk',
              description: 'Shell command constructed with user input.',
              location: { file: relFile, line: i + 1 },
              rule: 'no-command-injection',
              fix: {
                description: 'Validate and sanitize input, avoid shell=true',
                automated: false,
              },
              effort: 'medium',
              impact: 'high',
              references: ['https://owasp.org/www-community/attacks/Command_Injection'],
            });
          }
        }
      }

      // ─── Unsafe eval ──────────────────────────────────────────────────────
      for (const pattern of UNSAFE_EVAL_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith('//')) continue;
          if (pattern.test(line)) {
            issues.push({
              id: `security-eval-${relFile}-${i}`,
              category: 'security',
              severity: 'high',
              title: 'Unsafe eval() Usage',
              description: 'eval() or equivalent executes arbitrary code and is a security risk.',
              location: { file: relFile, line: i + 1 },
              rule: 'no-eval',
              fix: {
                description: 'Replace eval() with safe alternatives (JSON.parse, Function constructors avoided)',
                before: line.trim(),
                after: '// use JSON.parse() for data, or restructure logic',
                automated: false,
              },
              effort: 'medium',
              impact: 'high',
              references: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!'],
            });
          }
        }
      }

      // ─── CSRF: missing CSRF protection in route handlers ──────────────────
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const hasPostRoute = /app\.(post|put|patch|delete)\s*\(/.test(content);
        const hasCsrfProtection = /csrf|csurf|doubleCsrf|sameSite/.test(content);
        if (hasPostRoute && !hasCsrfProtection) {
          issues.push({
            id: `security-csrf-${relFile}`,
            category: 'security',
            severity: 'medium',
            title: 'Possible Missing CSRF Protection',
            description: 'Mutating route detected without visible CSRF protection middleware.',
            location: { file: relFile },
            rule: 'csrf-protection',
            fix: {
              description: 'Add csrf middleware (e.g., csurf or double-csrf)',
              automated: false,
            },
            effort: 'easy',
            impact: 'medium',
            references: ['https://owasp.org/www-community/attacks/csrf'],
          });
        }
      }
    }

    // ─── npm audit ────────────────────────────────────────────────────────────
    const auditIssues = await this.runNpmAudit(dir);
    issues.push(...auditIssues);

    const score = computeSecurityScore(issues);

    return {
      category: 'security',
      issues,
      score,
      filesScanned: files.length,
      duration: Date.now() - start,
      metadata: {
        secretsFound: issues.filter((i) => i.rule === 'no-hardcoded-secrets').length,
        npmVulnerabilities: auditIssues.length,
      },
    };
  }

  private redactLine(line: string): string {
    return line.replace(/(['"])[A-Za-z0-9+/=_\-]{10,}(['"])/g, '"[REDACTED]"');
  }

  private async runNpmAudit(dir: string): Promise<Issue[]> {
    try {
      const output = execSync('npm audit --json', {
        cwd: dir,
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).toString();

      const auditData = JSON.parse(output) as {
        vulnerabilities?: Record<string, {
          severity: string;
          name: string;
          title?: string;
          url?: string;
          fixAvailable?: boolean | { name: string; version: string };
        }>;
      };

      const issues: Issue[] = [];
      const vulns = auditData.vulnerabilities ?? {};

      for (const [, vuln] of Object.entries(vulns)) {
        const sev = this.mapNpmSeverity(vuln.severity);
        issues.push({
          id: `security-npm-${vuln.name}`,
          category: 'security',
          severity: sev,
          title: `Vulnerable Dependency: ${vuln.name}`,
          description: vuln.title ?? `Security vulnerability in ${vuln.name}`,
          location: { file: 'package.json' },
          rule: 'npm-audit',
          fix: {
            description: vuln.fixAvailable
              ? `Run: npm audit fix`
              : 'Update or replace the dependency manually',
            automated: !!vuln.fixAvailable,
          },
          effort: 'easy',
          impact: 'high',
          references: vuln.url ? [vuln.url] : [],
          tags: ['dependency', 'npm-audit'],
        });
      }

      return issues;
    } catch {
      logger.debug('npm audit not available or no package.json found');
      return [];
    }
  }

  private mapNpmSeverity(npm: string): Issue['severity'] {
    const map: Record<string, Issue['severity']> = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low',
      info: 'info',
    };
    return map[npm] ?? 'medium';
  }
}

function computeSecurityScore(issues: Issue[]): number {
  const penalties = {
    critical: 20,
    high: 12,
    medium: 5,
    low: 2,
    info: 0,
  };

  const total = issues.reduce((sum, i) => sum + (penalties[i.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - total));
}
