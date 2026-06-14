<div align="center">
  <h1>⚡ CodeSetter</h1>
  <p><strong>AI-powered repository auditing and optimization toolkit</strong></p>
  <p>
    <a href="https://www.npmjs.com/package/codesetter"><img src="https://img.shields.io/npm/v/codesetter?color=0ea5e9&label=npm" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/codesetter"><img src="https://img.shields.io/npm/dm/codesetter?color=8b5cf6" alt="downloads" /></a>
    <a href="https://github.com/RudrakshRakeshZodage/CodeSetter/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license" /></a>
    <a href="https://github.com/RudrakshRakeshZodage/CodeSetter/actions"><img src="https://img.shields.io/github/actions/workflow/status/RudrakshRakeshZodage/CodeSetter/publish.yml?label=CI" alt="CI" /></a>
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js" alt="Node.js" />
  </p>
</div>

---

CodeSetter scans any JavaScript/TypeScript repository and produces actionable scores, reports, and AI-powered fix suggestions across **6 dimensions**: Code Quality, Security, Performance, Accessibility, Testing, and Architecture.

## ✨ Features

- 🔍 **6 Deep Scanners** — AST-based analysis with ts-morph
- 🤖 **AI Integration** — OpenAI, Gemini, and Ollama support
- 📊 **Scoring System** — Weighted 0–100 score with grades
- 📄 **Multi-format Reports** — HTML, JSON, Markdown
- 🛠️ **Auto-fix Suggestions** — Actionable fix hints per issue
- 🔌 **Plugin System** — Register custom scanners
- 🖥️ **CLI + SDK** — Use from terminal or import programmatically
- ⚡ **Zero-config** — Works out of the box on any repo

## 📦 Installation

```bash
# Global CLI
npm install -g codesetter

# Or use directly with npx
npx codesetter audit ./

# As a project dependency (SDK)
npm install codesetter
```

## 🚀 Quick Start

### CLI

```bash
# Full audit of current directory
codesetter audit

# Run a specific scanner
codesetter security ./src
codesetter quality ./src
codesetter performance ./

# View overall score
codesetter score

# Generate reports (HTML + JSON + Markdown)
codesetter report

# Show AI-powered fix suggestions (requires API key)
codesetter fix --ai openai

# Audit with AI insights
codesetter audit --ai gemini --key YOUR_KEY
```

### SDK (Programmatic)

```typescript
import { auditProject, scanSecurity, scanQuality, generateReport } from 'codesetter';

// Full audit
const report = await auditProject('./');
console.log(report.score.overall); // 91

// Single scanner
const securityResult = await scanSecurity('./src');
console.log(securityResult.issues); // [...issues]

// Generate HTML report
await generateReport(report, { formats: ['html', 'json', 'markdown'] });
```

## 📋 CLI Commands

| Command | Description |
|---------|-------------|
| `codesetter audit [path]` | Run full audit across all scanners |
| `codesetter quality [path]` | Code quality scan only |
| `codesetter security [path]` | Security vulnerability scan |
| `codesetter performance [path]` | Performance analysis |
| `codesetter accessibility [path]` | Accessibility audit |
| `codesetter testing [path]` | Test coverage analysis |
| `codesetter architecture [path]` | Architecture & structure analysis |
| `codesetter dependencies [path]` | Dependency vulnerability check |
| `codesetter score [path]` | Show score summary |
| `codesetter report [path]` | Generate HTML/JSON/MD reports |
| `codesetter fix [path]` | Show AI-powered fix suggestions |

### CLI Options

```
Options:
  -p, --path <path>        Target directory (default: "./")
  -f, --format <formats>   Report formats: html,json,md (default: "html,json,md")
  -o, --output <dir>       Output directory (default: ".codesetter/reports")
  --ai <provider>          AI provider: openai | gemini | ollama
  --key <apiKey>           AI API key
  --model <model>          AI model name
  --ignore <patterns>      Comma-separated glob patterns to ignore
  --no-ai                  Disable AI suggestions
  --json                   Output results as JSON (CI-friendly)
  --severity <level>       Min severity to report: low|medium|high|critical
  -v, --version            Show version
  -h, --help               Show help
```

## 📊 Sample Output

```
⚡ CodeSetter — AI-Powered Code Audit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Scanning: ./src  (47 files, TypeScript + React)

  ✓ Quality Scanner      23 issues found
  ✓ Security Scanner      5 critical issues found
  ✓ Performance Scanner   8 issues found
  ✓ Accessibility Scanner 12 issues found
  ✓ Testing Scanner       6 files without tests
  ✓ Architecture Scanner  Circular deps detected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OVERALL SCORE: 78/100  (Grade: C+)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Quality        ████████░░  82/100
  Security       █████░░░░░  52/100  ⚠ CRITICAL
  Performance    ███████░░░  74/100
  Accessibility  ██████░░░░  65/100
  Testing        ███████░░░  71/100
  Architecture   █████████░  88/100

📄 Reports saved to .codesetter/reports/
   → audit-report.html
   → audit-report.json
   → audit-report.md
```

## 🤖 AI Configuration

CodeSetter supports three AI providers:

### OpenAI

```bash
codesetter audit --ai openai --key sk-...
# or set environment variable
export OPENAI_API_KEY=sk-...
codesetter audit --ai openai
```

### Google Gemini

```bash
export GEMINI_API_KEY=AIza...
codesetter audit --ai gemini
```

### Ollama (local, free)

```bash
# Make sure Ollama is running
ollama serve
codesetter audit --ai ollama --model codellama
```

## ⚙️ Configuration File

Create `.codesetterrc.json` in your project root:

```json
{
  "ignore": ["node_modules", "dist", "*.test.ts"],
  "severity": "medium",
  "ai": {
    "provider": "gemini",
    "model": "gemini-pro"
  },
  "scanners": {
    "quality": true,
    "security": true,
    "performance": true,
    "accessibility": true,
    "testing": true,
    "architecture": true
  },
  "scoring": {
    "weights": {
      "quality": 0.2,
      "security": 0.25,
      "performance": 0.2,
      "accessibility": 0.1,
      "testing": 0.15,
      "architecture": 0.1
    }
  },
  "report": {
    "formats": ["html", "json", "markdown"],
    "output": ".codesetter/reports"
  }
}
```

## 🔌 Plugin System

Register custom scanners:

```typescript
import { registerPlugin } from 'codesetter';

registerPlugin({
  name: 'my-custom-scanner',
  async scan(files, config) {
    return {
      issues: [],
      score: 100,
    };
  },
});
```

## 🧪 Supported Stacks

| Stack | Detection | Specialized Analysis |
|-------|-----------|---------------------|
| JavaScript | ✅ | ✅ |
| TypeScript | ✅ | ✅ |
| React | ✅ | ✅ Re-renders, hooks |
| Next.js | ✅ | ✅ SSR/SSG patterns |
| Node.js / Express | ✅ | ✅ Middleware, async |
| NestJS | ✅ | ✅ DI, decorators |
| Vue | ✅ | ✅ |
| Angular | ✅ | ✅ |

## 🛡️ What's Scanned

### Security Scanner
- Hardcoded API keys, JWT secrets, database credentials
- SQL injection, XSS, CSRF, command injection patterns
- Unsafe `eval()` usage
- `npm audit` dependency vulnerabilities

### Quality Scanner
- Unused imports/variables (AST-based)
- Dead code detection
- Cyclomatic complexity per function
- Long methods (>50 lines), large files (>500 lines)
- Deep nesting (>4 levels)
- SOLID principle violations

### Performance Scanner
- Heavy bundle dependencies
- Expensive nested loops
- Missing `React.memo`, `useMemo`, `useCallback`
- Missing route lazy-loading
- Duplicate API call patterns

### Accessibility Scanner
- Missing `alt` attributes on images
- Missing labels for form inputs
- Missing ARIA attributes
- Non-semantic HTML patterns

### Testing Scanner
- Source files without test files
- Coverage estimation
- Untested critical modules (auth, API routes, DB)

### Architecture Scanner
- Folder structure quality
- Circular dependency detection
- Layer separation violations
- Coupling and modularity metrics
- Design pattern detection

## 📄 License

MIT © [Rudraksh Zodage](https://github.com/RudrakshRakeshZodage)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/RudrakshRakeshZodage">Rudraksh Zodage</a></p>
</div>
