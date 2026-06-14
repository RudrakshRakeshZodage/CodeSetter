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
  ⚡ CodeSetter — AI-Powered Code Auditor v${version}
  ─────────────────────────────────────────────────
  Scan any repository for quality, security, performance,
  accessibility, testing, and architecture issues.

  Examples:
    codesetter audit ./
    codesetter security ./src
    codesetter audit --ai gemini --key YOUR_KEY
    codesetter report --format html,json
    codesetter fix --ai openai
`
  );

// Register all commands
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
