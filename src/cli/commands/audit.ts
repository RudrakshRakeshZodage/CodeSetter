import { Command } from 'commander';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { generateReports } from '../../reports/report-manager.js';
import { runAIAnalysis } from '../../ai/ai-analyzer.js';
import {
  printHeader,
  printScoreReport,
  printSummary,
  printScanResult,
  printReportPaths,
  printError,
  createSpinner,
} from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';
import path from 'path';
import type { CLIOptions } from '../../types/index.js';

export function registerAuditCommand(program: Command): void {
  program
    .command('audit [path]')
    .description('Run a full audit across all scanners')
    .option('-f, --format <formats>', 'Report formats: html,json,md', 'html,json,md')
    .option('-o, --output <dir>', 'Output directory', '.codesetter/reports')
    .option('--ai <provider>', 'AI provider: openai | gemini | ollama')
    .option('--key <apiKey>', 'AI API key')
    .option('--model <model>', 'AI model')
    .option('--ignore <patterns>', 'Comma-separated glob patterns to ignore')
    .option('--severity <level>', 'Min severity: low|medium|high|critical', 'low')
    .option('--json', 'Output results as JSON (CI mode)')
    .action(async (targetPath: string | undefined, opts: CLIOptions) => {
      const dir = resolvePath(targetPath ?? '.');

      try {
        const config = await loadConfig(dir, {
          ignore: opts.ignore?.split(',').map((s) => s.trim()),
          ai: opts.ai
            ? { provider: opts.ai, apiKey: opts.key, model: opts.model }
            : undefined,
          report: {
            formats: (opts.format?.split(',') ?? ['html', 'json', 'markdown']) as ('html' | 'json' | 'markdown')[],
            output: path.resolve(dir, opts.output ?? '.codesetter/reports'),
          },
        });

        if (!opts.json) {
          printHeader();
          console.log(`  Scanning: ${dir}\n`);
        }

        const spinner = opts.json ? null : createSpinner('Running scanners...');
        spinner?.start();

        const engine = new AuditEngine();
        const report = await engine.run(config);

        spinner?.stop();

        // AI analysis (optional)
        if (config.ai) {
          const aiSpinner = opts.json ? null : createSpinner('Generating AI insights...');
          aiSpinner?.start();
          report.ai = (await runAIAnalysis(report, config.ai)) ?? undefined;
          aiSpinner?.stop();
        }

        // Generate reports
        const reportPaths = await generateReports(report, {
          formats: config.report.formats,
          outputDir: config.report.output,
        });
        report.reportPaths = reportPaths as typeof report.reportPaths;

        if (opts.json) {
          console.log(JSON.stringify({ score: report.score, summary: report.summary, reportPaths }, null, 2));
          return;
        }

        // Print results
        for (const result of report.results) {
          printScanResult(result);
        }

        printScoreReport(report.score);
        printSummary(report);
        printReportPaths(reportPaths as Record<string, string>);

        // Exit with non-zero code if critical issues found
        if (report.summary.criticalIssues > 0) {
          process.exitCode = 1;
        }
      } catch (err) {
        printError((err as Error).message);
        process.exit(1);
      }
    });
}
