import { Command } from 'commander';
import { createRequire } from 'module';
import { registerAuditCommand } from './commands/audit.js';
import { registerQualityCommand } from './commands/quality.js';
import { registerSecurityCommand } from './commands/security.js';
import { registerPerformanceCommand } from './commands/performance.js';
import { registerArchitectureCommand } from './commands/architecture.js';
import { registerTestingCommand } from './commands/testing.js';
import { registerAccessibilityCommand } from './commands/accessibility.js';
import { registerDependenciesCommand } from './commands/dependencies.js';
import { registerScoreCommand } from './commands/score.js';
import { registerReportCommand } from './commands/report.js';
import { registerFixCommand } from './commands/fix.js';
import { registerInitCommand } from './commands/init.js';

// Read version from package.json
const _require = createRequire(import.meta.url);
let version = '1.0.0';
try {
  const pkg = _require('../../package.json') as { version: string };
  version = pkg.version;
} catch {
  // Fallback
}

const program = new Command();

program
  .name('codesetter')
  .description('AI-powered repository auditing and optimization toolkit')
  .version(version, '-v, --version', 'Show version number')
  .addHelpText(
    'before',
    `
  ⚡ CodeSetter v${version} — By Rudraksh Zodage
  ─────────────────────────────────────────────────
  AI-powered code audit: quality · security · performance
  accessibility · testing · architecture

  Quick Start:
    codesetter init          ← interactive setup (run first!)
    codesetter audit ./      ← full audit + PDF/JSON/MD reports
    codesetter fix ./        ← auto-apply fixes to your codebase
    codesetter score ./      ← quick score overview

  With AI:
    codesetter audit --ai gemini --key YOUR_KEY
    codesetter fix   --ai openai --key sk-...
`
  );

// Register all commands
registerInitCommand(program);
registerAuditCommand(program);
registerQualityCommand(program);
registerSecurityCommand(program);
registerPerformanceCommand(program);
registerArchitectureCommand(program);
registerTestingCommand(program);
registerAccessibilityCommand(program);
registerDependenciesCommand(program);
registerScoreCommand(program);
registerReportCommand(program);
registerFixCommand(program);

program.parse(process.argv);
