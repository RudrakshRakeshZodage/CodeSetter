/**
 * CodeSetter — Regex detection patterns for security and quality scanning.
 */

// ─── Security Patterns ────────────────────────────────────────────────────────

export const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp; severity: 'high' | 'critical' }> = [
  {
    name: 'AWS Access Key',
    pattern: /(?:AKIA|AIPA|ASIA|AROA)[A-Z0-9]{16}/,
    severity: 'critical',
  },
  {
    name: 'AWS Secret Key',
    pattern: /aws[_\-\s]?secret[_\-\s]?(?:access[_\-\s]?)?key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/i,
    severity: 'critical',
  },
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    severity: 'critical',
  },
  {
    name: 'GitHub Token',
    pattern: /gh[opsu]_[A-Za-z0-9_]{36,}/,
    severity: 'critical',
  },
  {
    name: 'Stripe Secret Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}/,
    severity: 'critical',
  },
  {
    name: 'Stripe Publishable Key',
    pattern: /pk_live_[0-9a-zA-Z]{24,}/,
    severity: 'high',
  },
  {
    name: 'Generic API Key',
    pattern: /(?:api[_\-]?key|apikey)\s*[=:]\s*['"]([A-Za-z0-9\-_]{20,})['"]?/i,
    severity: 'high',
  },
  {
    name: 'JWT Secret',
    pattern: /jwt[_\-]?secret\s*[=:]\s*['"](.{10,})['"]?/i,
    severity: 'critical',
  },
  {
    name: 'Database Password',
    pattern: /(?:db|database|mysql|postgres|mongo|redis)[_\-]?(?:pass|password|pwd)\s*[=:]\s*['"](.{6,})['"]?/i,
    severity: 'critical',
  },
  {
    name: 'Database Connection String',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@/i,
    severity: 'critical',
  },
  {
    name: 'Private Key Header',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
    severity: 'critical',
  },
  {
    name: 'Hardcoded Password Variable',
    pattern: /(?:password|passwd|pwd)\s*=\s*['"](?!process\.env)[A-Za-z0-9!@#$%^&*()_+]{6,}['"]/i,
    severity: 'high',
  },
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}/,
    severity: 'critical',
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-(?:[A-Za-z0-9-]+)/,
    severity: 'high',
  },
  {
    name: 'Firebase Config',
    pattern: /firebaseConfig\s*=\s*\{[\s\S]*?apiKey\s*:\s*['"][A-Za-z0-9\-_]+['"]/i,
    severity: 'high',
  },
];

export const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(?:query|execute|run)\s*\(\s*[`'"]\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s+.*?\$\{/i,
  /(?:query|execute|run)\s*\(\s*['"`]\s*.*?'\s*\+\s*(?:req\.|params\.|query\.)/i,
  /\bexec(?:Sync)?\s*\(`[^`]*\${[^}]+}`\s*\)/i,
];

export const XSS_PATTERNS: RegExp[] = [
  /innerHTML\s*=\s*(?!['"`]\s*['"`])/,
  /outerHTML\s*=/,
  /document\.write\s*\(/,
  /\$\(.*?\)\.html\s*\(/,
  /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html/,
];

export const COMMAND_INJECTION_PATTERNS: RegExp[] = [
  /(?:exec|execSync|spawn|spawnSync)\s*\(\s*(?:[`'"].*?\$\{|.*?\+\s*(?:req\.|params\.|query\.))/i,
  /child_process.*exec\s*\(.*\+/,
];

export const UNSAFE_EVAL_PATTERNS: RegExp[] = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /setTimeout\s*\(\s*['"`]/,
  /setInterval\s*\(\s*['"`]/,
];

// ─── Quality Patterns ─────────────────────────────────────────────────────────

export const CONSOLE_LOG_PATTERN = /\bconsole\.(log|debug|info)\s*\(/;

export const TODO_PATTERN = /\/\/\s*(?:TODO|FIXME|HACK|XXX|TEMP|BUG)(?:\s*:|\s+)/i;

export const DEBUGGER_PATTERN = /\bdebugger\b/;

// ─── Performance Patterns ─────────────────────────────────────────────────────

export const HEAVY_DEPS: Record<string, { weight: string; alternative?: string }> = {
  moment: { weight: '67 KB', alternative: 'date-fns or dayjs' },
  lodash: { weight: '71 KB', alternative: 'lodash-es or native methods' },
  jquery: { weight: '87 KB', alternative: 'vanilla JS' },
  'bootstrap/dist/js/bootstrap.bundle': { weight: '60 KB', alternative: 'component libraries' },
  rxjs: { weight: '200 KB', alternative: 'only import needed operators' },
  'three/build/three': { weight: '580 KB', alternative: 'import specific modules' },
};

export const NESTED_LOOP_PATTERN =
  /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)\s*\{/s;

// ─── Accessibility Patterns ───────────────────────────────────────────────────

export const IMG_WITHOUT_ALT = /<img(?![^>]*\balt=)[^>]*(\/?>|>)/i;
export const INPUT_WITHOUT_LABEL = /<input(?![^>]*\bid=)[^>]*(\/?>|>)/i;

// ─── Architecture Patterns ───────────────────────────────────────────────────

export const CIRCULAR_IMPORT_HINT = /import\s+.*\s+from\s+['"]\.\.\/.*['"]/;
