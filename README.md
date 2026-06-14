<div align="center">
  <h1>⚡ CodeSetter - The Best AI Code Review & Audit Tool</h1>
  <p><strong>CodeSetter: The ultimate AI-powered repository auditing and optimization toolkit</strong></p>
  <p>
    <a href="https://www.npmjs.com/package/codesetter"><img src="https://img.shields.io/npm/v/codesetter?color=0ea5e9&label=npm" alt="CodeSetter npm version" /></a>
    <a href="https://www.npmjs.com/package/codesetter"><img src="https://img.shields.io/npm/dm/codesetter?color=8b5cf6" alt="CodeSetter npm downloads" /></a>
    <a href="https://github.com/RudrakshRakeshZodage/CodeSetter/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="CodeSetter MIT license" /></a>
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="CodeSetter TypeScript support" />
    <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js" alt="CodeSetter Node.js support" />
  </p>
  <p><strong>CodeSetter</strong> scans any JavaScript/TypeScript repository and produces actionable scores, reports, and AI-powered fix suggestions across <strong>6 deep dimensions</strong>: Code Quality, Security, Performance, Accessibility, Testing, and Architecture.</p>
</div>

---

## ❓ What is CodeSetter?
**CodeSetter** (also searched as *codesetter*, *code-setter*, or *code setter*) is an all-in-one static analysis and AI auditing CLI tool. If you are looking to automatically find security vulnerabilities, refactor architecture, or improve code quality, **CodeSetter** is the ultimate developer companion.

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📋 CLI Commands & Usage](#-cli-commands--usage)
- [📊 Understanding the Output](#-understanding-the-output)
- [🤖 AI Integration](#-ai-integration)
- [⚙️ Configuration File](#️-configuration-file)
- [💻 SDK (Programmatic Usage)](#-sdk-programmatic-usage)
- [🔌 Plugin System](#-plugin-system)
- [🛡️ What We Scan For](#️-what-we-scan-for)

---

## ✨ Features

- 🔍 **6 Deep Scanners** — AST-based analysis utilizing `ts-morph` for extreme precision.
- 🤖 **AI Integration** — Supports **OpenAI**, **Gemini**, and **Ollama** (for local/offline processing) to suggest code fixes.
- 📊 **Scoring System** — Generates a weighted 0–100 score with grades for your entire project.
- 📄 **Multi-format Reports** — Exports beautifully formatted HTML, JSON, and Markdown reports.
- 🛠️ **Auto-fix Suggestions** — Get actionable, line-by-line fix hints for every detected issue.
- ⚡ **Zero-config** — Works directly out of the box on any JavaScript, TypeScript, React, Next.js, or Node.js repository.

---

## 📦 Installation

CodeSetter can be installed globally for CLI use or as a dependency in your project for API/SDK usage.

### Global CLI Installation (Recommended)

```bash
npm install -g codesetter
```

*Alternatively, run it instantly without installing globally:*
```bash
npx codesetter audit ./
```

### Local Project Installation

```bash
npm install codesetter --save-dev
```

---

## 🚀 Quick Start

To instantly audit your current working directory and generate a report, simply run:

```bash
codesetter audit
```

This will run all 6 scanners, display a progress terminal output, and create a `.codesetter/reports` directory containing your HTML, JSON, and MD reports.

---

## 📋 CLI Commands & Usage

CodeSetter provides a robust command-line interface.

### The `audit` Command
Run a full audit across all available scanners.
```bash
codesetter audit [path] [options]

# Example: Audit the src folder and ignore test files
codesetter audit ./src --ignore "*.test.ts"
```

### Individual Scanners
If you only want to check a specific metric, you can run individual scanners:
```bash
codesetter quality [path]       # Check code quality and complexity
codesetter security [path]      # Scan for vulnerabilities and secrets
codesetter performance [path]   # Identify performance bottlenecks
codesetter accessibility [path] # Check a11y compliance
codesetter testing [path]       # Analyze test coverage
codesetter architecture [path]  # Check folder structure and dependencies
```

### Reporting & Utility Commands
```bash
codesetter score [path]         # Output a quick summary score without full reports
codesetter report [path]        # Re-generate HTML/JSON/MD reports from the last scan
codesetter fix [path]           # Request AI-powered fix suggestions for found issues
```

### Global Options

| Option | Description | Example |
|--------|-------------|---------|
| `-p, --path <path>` | Target directory to scan. | `-p ./src` |
| `-f, --format <list>` | Formats to generate: `html,json,md`. | `-f html,md` |
| `-o, --output <dir>` | Directory to save reports. | `-o ./my-reports` |
| `--ai <provider>` | AI Provider to use (`openai`, `gemini`, `ollama`). | `--ai gemini` |
| `--key <apiKey>` | API key for the chosen AI provider. | `--key AIzaSy...` |
| `--model <model>` | Specific AI model to use. | `--model gpt-4o` |
| `--ignore <glob>` | Comma-separated glob patterns to ignore. | `--ignore "dist,node_modules"` |
| `--severity <level>` | Minimum issue severity to report (`low`, `medium`, `high`, `critical`). | `--severity high` |
| `--json` | Force standard output as JSON (CI-friendly). | `--json` |

---

## 📊 Understanding the Output

When you run an audit, CodeSetter gives you a high-level console summary:

```text
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
```

Open `.codesetter/reports/audit-report.html` in your browser for a beautiful, detailed breakdown of every single issue found!

---

## 🤖 AI Integration

CodeSetter uses AI to suggest fixes for complex architectural, security, and quality issues.

### 1. Google Gemini
```bash
export GEMINI_API_KEY="your-gemini-key"
codesetter audit --ai gemini
```

### 2. OpenAI
```bash
export OPENAI_API_KEY="sk-..."
codesetter audit --ai openai
```

### 3. Ollama (100% Free & Local)
Don't want to send code to the cloud? Use Ollama!
1. Start Ollama: `ollama serve`
2. Run CodeSetter:
```bash
codesetter audit --ai ollama --model codellama
```

---

## ⚙️ Configuration File

To avoid typing out options every time, create a `.codesetterrc.json` file in your project root:

```json
{
  "ignore": ["node_modules", "dist", "build", "*.test.ts"],
  "severity": "medium",
  "ai": {
    "provider": "gemini",
    "model": "gemini-1.5-pro"
  },
  "scanners": {
    "quality": true,
    "security": true,
    "performance": true,
    "accessibility": true,
    "testing": true,
    "architecture": true
  },
  "report": {
    "formats": ["html", "json", "markdown"],
    "output": ".codesetter/reports"
  }
}
```

---

## 💻 SDK (Programmatic Usage)

You can build your own tools on top of CodeSetter's engine!

```typescript
import { auditProject, scanSecurity, generateReport } from 'codesetter';

async function main() {
  // 1. Run a full audit
  const report = await auditProject('./src', {
    ignore: ['**/tests/**']
  });
  
  console.log(`Overall Score: ${report.score.overall}`);

  // 2. Or, run a specific scanner directly
  const securityResult = await scanSecurity('./src');
  console.log('Security Issues:', securityResult.issues);

  // 3. Generate Reports manually
  await generateReport(report, {
    formats: ['html', 'json'],
    outputDir: './audit-results'
  });
}

main();
```

---

## 🔌 Plugin System

Need to enforce custom company rules? Register a custom scanner plugin!

```typescript
import { registerPlugin } from 'codesetter';

registerPlugin({
  name: 'company-naming-conventions',
  async scan(files, config) {
    // Implement your AST analysis here...
    return {
      issues: [
        { message: 'Variable does not follow company rules', file: 'app.ts', line: 10 }
      ],
      score: 85,
    };
  },
});
```

---

## 🛡️ What We Scan For

*   **Security:** Hardcoded API keys, SQL injection patterns, unsafe `eval()`, exposed JWT secrets.
*   **Quality:** Unused variables/imports, cyclomatic complexity, dead code, long methods (>50 lines), deep nesting.
*   **Performance:** Expensive nested loops, duplicate API calls, heavy bundle imports, missing React memoization.
*   **Accessibility:** Missing `alt` tags, lack of ARIA labels, non-semantic HTML structures.
*   **Testing:** Untested critical modules, test coverage estimation.
*   **Architecture:** Circular dependencies, bad folder structures, tight coupling between layers.

---

## 🔍 Frequently Asked Questions (SEO)

### How to audit code with AI?
By installing **CodeSetter**, you can automatically audit your code with AI. CodeSetter uses OpenAI, Gemini, or Ollama to read your code, identify security vulnerabilities, and suggest architectural improvements.

### CodeSetter vs SonarQube?
While SonarQube relies heavily on rigid static rules, **CodeSetter** integrates directly with Large Language Models (LLMs) to provide contextual, AI-driven auto-fixes tailored exactly to your unique codebase logic.

### Is CodeSetter free?
Yes! CodeSetter is an open-source tool. You can even run the AI capabilities completely free and offline by utilizing the Ollama integration.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/RudrakshRakeshZodage">Rudraksh Zodage</a></p>
  <p>License: MIT | Search terms: codesetter, code setter, ai code reviewer, static analysis, vulnerability scanner</p>
</div>
