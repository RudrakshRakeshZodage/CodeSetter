import { Command } from 'commander';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { printHeader, printScoreReport, printError, createSpinner } from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';

export function registerScoreCommand(program: Command): void {
  program
    .command('score [path]')
    .description('Show the overall quality score summary')
    .option('--json', 'Output results as JSON')
    .action(async (targetPath: string | undefined, opts: { json?: boolean }) => {
      const dir = resolvePath(targetPath ?? '.');

      try {
        const config = await loadConfig(dir);

        if (!opts.json) {
          printHeader();
          console.log(`  Computing score for: ${dir}\n`);
        }

        const spinner = opts.json ? null : createSpinner('Scanning...');
        spinner?.start();

        const engine = new AuditEngine();
        const report = await engine.run(config);

        spinner?.stop();

        if (opts.json) {
          console.log(JSON.stringify(report.score, null, 2));
          return;
        }

        printScoreReport(report.score);
      } catch (err) {
        printError((err as Error).message);
        process.exit(1);
      }
    });
}
