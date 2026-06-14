import { Command } from 'commander';
import chalk from 'chalk';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { runAIAnalysis } from '../../ai/ai-analyzer.js';
import {
  printHeader,
  printScoreReport,
  printScanResult,
  printError,
  createSpinner,
} from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';
import {
  buildFixPlan,
  printFixPlan,
  confirmFixes,
  applyFixes,
  printFixResults,
} from '../../fixers/auto-fixer.js';
import { generateReports } from '../../reports/report-manager.js';
import type { AIProvider, Issue } from '../../types/index.js';
import path from 'path';

export function registerFixCommand(program: Command): void {
  program
    .command('fix [path]')
    .description('Preview and auto-apply fixes to your codebase directly')
    .option('--ai <provider>', 'AI provider: openai | gemini | ollama')
    .option('--key <apiKey>', 'AI API key')
    .option('--model <model>', 'AI model')
    .option('--dry-run', 'Preview fixes without applying them')
    .option('--no-confirm', 'Apply fixes without asking for confirmation')
    .option('--report', 'Also generate PDF/JSON/MD reports after fixing')
    .option('--json', 'Output as JSON (CI mode)')
    .action(
      async (
        targetPath: string | undefined,
        opts: {
          ai?: string;
          key?: string;
          model?: string;
          dryRun?: boolean;
          confirm?: boolean;
          report?: boolean;
          json?: boolean;
        }
      ) => {
        const dir = resolvePath(targetPath ?? '.');

        try {
          const config = await loadConfig(dir, {
            ai: opts.ai
              ? {
                  provider: opts.ai as AIProvider,
                  apiKey: opts.key ?? process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY,
                  model: opts.model,
                }
              : undefined,
          });

          if (!opts.json) {
            printHeader();
            console.log(`\n  Scanning: ${chalk.cyan(dir)}\n`);
          }

          // ─── Step 1: Scan ─────────────────────────────────────────────────
          const spinner = opts.json ? null : createSpinner('Running all scanners...');
          spinner?.start();

          const engine = new AuditEngine();
          const report = await engine.run(config);

          spinner?.stop();

          if (opts.json) {
            // In JSON mode, just output issues with fix info
            const fixable = report.results
              .flatMap((r) => r.issues)
              .filter((i: Issue) => i.fix?.automated);
            console.log(JSON.stringify({ fixableCount: fixable.length, issues: fixable }, null, 2));
            return;
          }

          // ─── Step 2: Show category scores ────────────────────────────────
          console.log(chalk.bold.cyan('\n  📊 Current Scores:\n'));
          for (const result of report.results) {
            printScanResult(result);
          }
          printScoreReport(report.score);

          // ─── Step 3: AI Analysis (optional) ──────────────────────────────
          if (config.ai) {
            const aiSpinner = createSpinner('Getting AI fix suggestions...');
            aiSpinner.start();
            report.ai = (await runAIAnalysis(report, config.ai)) ?? undefined;
            aiSpinner.stop();

            if (report.ai) {
              console.log(`\n  ${chalk.bold('🤖 AI Summary:')} ${chalk.gray(report.ai.overallSummary)}`);
              if (report.ai.priorityActions.length > 0) {
                console.log(`\n  ${chalk.bold('Priority Actions:')}`);
                for (const a of report.ai.priorityActions.slice(0, 5)) {
                  console.log(`    ${chalk.cyan('→')} ${a}`);
                }
              }
            }
          }

          // ─── Step 4: Build fix plan ───────────────────────────────────────
          const allIssues = report.results.flatMap((r) => r.issues);
          const plan = await buildFixPlan(allIssues, dir);

          printFixPlan(plan, dir);

          if (plan.fileChanges.size === 0) {
            console.log(chalk.gray('  Nothing to auto-fix. Review issues manually.\n'));
            return;
          }

          // ─── Step 5: Dry-run or apply ─────────────────────────────────────
          if (opts.dryRun) {
            console.log(chalk.yellow('  Dry-run mode — no files were modified.\n'));
            return;
          }

          const shouldApply = opts.confirm === false ? true : await confirmFixes();

          if (!shouldApply) {
            console.log(chalk.gray('\n  Cancelled. No files were modified.\n'));
            return;
          }

          const applySpinner = createSpinner('Applying fixes to your codebase...');
          applySpinner.start();
          const results = await applyFixes(plan);
          applySpinner.stop();

          printFixResults(results, dir);

          // ─── Step 6: Generate reports ─────────────────────────────────────
          if (opts.report) {
            const reportSpinner = createSpinner('Generating reports...');
            reportSpinner.start();
            const reportPaths = await generateReports(report, {
              formats: ['pdf', 'json', 'markdown'],
              outputDir: path.resolve(dir, config.report.output),
            });
            reportSpinner.stop();

            console.log(`  ${chalk.bold('📄 Reports saved:')}`);
            if (reportPaths.pdf)      console.log(`    ${chalk.green('→')} PDF      ${chalk.cyan(reportPaths.pdf)}`);
            if (reportPaths.json)     console.log(`    ${chalk.green('→')} JSON     ${chalk.cyan(reportPaths.json)}`);
            if (reportPaths.markdown) console.log(`    ${chalk.green('→')} Markdown ${chalk.cyan(reportPaths.markdown)}`);
            console.log('');
          }
        } catch (err) {
          printError((err as Error).message);
          process.exit(1);
        }
      }
    );
}
