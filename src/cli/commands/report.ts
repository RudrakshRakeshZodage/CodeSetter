import { Command } from 'commander';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { generateReports } from '../../reports/report-manager.js';
import {
  printHeader,
  printReportPaths,
  printError,
  createSpinner,
} from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';
import path from 'path';

export function registerReportCommand(program: Command): void {
  program
    .command('report [path]')
    .description('Generate HTML, JSON, and Markdown audit reports')
    .option('-f, --format <formats>', 'Formats: html,json,md', 'html,json,md')
    .option('-o, --output <dir>', 'Output directory', '.codesetter/reports')
    .action(
      async (
        targetPath: string | undefined,
        opts: { format?: string; output?: string }
      ) => {
        const dir = resolvePath(targetPath ?? '.');

        try {
          const config = await loadConfig(dir, {
            report: {
              formats: (opts.format?.split(',') ?? ['html', 'json', 'markdown']) as ('html' | 'json' | 'markdown')[],
              output: path.resolve(dir, opts.output ?? '.codesetter/reports'),
            },
          });

          printHeader();
          console.log(`  Generating reports for: ${dir}\n`);

          const spinner = createSpinner('Scanning project...');
          spinner.start();

          const engine = new AuditEngine();
          const report = await engine.run(config);

          spinner.text = 'Writing reports...';
          const reportPaths = await generateReports(report, {
            formats: config.report.formats,
            outputDir: config.report.output,
          });

          spinner.stop();
          printReportPaths(reportPaths as Record<string, string>);
        } catch (err) {
          printError((err as Error).message);
          process.exit(1);
        }
      }
    );
}
