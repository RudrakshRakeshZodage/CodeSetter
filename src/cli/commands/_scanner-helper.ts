import { Command } from 'commander';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { printHeader, printScanResult, printIssues, printError, createSpinner } from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';
import type { Category } from '../../types/index.js';

/**
 * Helper to register a single-category scanner command.
 */
export function registerScannerCommand(
  program: Command,
  name: string,
  category: Category,
  description: string
): void {
  program
    .command(`${name} [path]`)
    .description(description)
    .option('--ignore <patterns>', 'Comma-separated glob patterns to ignore')
    .option('--json', 'Output results as JSON')
    .option('--severity <level>', 'Min severity: low|medium|high|critical', 'low')
    .action(async (targetPath: string | undefined, opts: { ignore?: string; json?: boolean; severity?: string }) => {
      const dir = resolvePath(targetPath ?? '.');

      try {
        const config = await loadConfig(dir, {
          ignore: opts.ignore?.split(',').map((s) => s.trim()),
        });

        if (!opts.json) {
          printHeader();
          console.log(`  Running ${name} scan on: ${dir}\n`);
        }

        const spinner = opts.json ? null : createSpinner(`Scanning ${category}...`);
        spinner?.start();

        const engine = new AuditEngine();
        const result = await engine.runScanner(category, config);

        spinner?.stop();

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        printScanResult(result);
        printIssues(result, 20);

        if (result.issues.some((i) => i.severity === 'critical' || i.severity === 'high')) {
          process.exitCode = 1;
        }
      } catch (err) {
        printError((err as Error).message);
        process.exit(1);
      }
    });
}
