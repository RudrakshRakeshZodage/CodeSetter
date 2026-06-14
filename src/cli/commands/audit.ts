import { Command } from 'commander';
import chalk from 'chalk';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { generateReports } from '../../reports/report-manager.js';
import { runAIAnalysis } from '../../ai/ai-analyzer.js';
import {
  printHeader,
  printScoreReport,
  printSummary,
  printError,
  createSpinner,
} from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';
import { scoreColor } from '../../scoring/scorer.js';
import path from 'path';
import type { CLIOptions, ScanResult } from '../../types/index.js';

const CATEGORY_ICONS: Record<string, string> = {
  quality:       '🔍 Quality      ',
  security:      '🛡️  Security     ',
  performance:   '⚡ Performance  ',
  accessibility: '♿ Accessibility',
  testing:       '🧪 Testing      ',
  architecture:  '🏗️  Architecture ',
};

export function registerAuditCommand(program: Command): void {
  program
    .command('audit [path]')
    .description('Run a full audit across all scanners')
    .option('-o, --output <dir>', 'Output directory', '.codesetter/reports')
    .option('--ai <provider>', 'AI provider: openai | gemini | ollama')
    .option('--key <apiKey>', 'AI API key')
    .option('--model <model>', 'AI model')
    .option('--ignore <patterns>', 'Comma-separated glob patterns to ignore')
    .option('--severity <level>', 'Min severity: low|medium|high|critical', 'low')
    .option('--no-report', 'Skip report generation')
    .option('--json', 'Output results as JSON (CI-friendly)')
    .action(async (targetPath: string | undefined, opts: CLIOptions & { report?: boolean; noReport?: boolean }) => {
      const dir = resolvePath(targetPath ?? '.');

      try {
        const config = await loadConfig(dir, {
          ignore: opts.ignore?.split(',').map((s) => s.trim()),
          ai: opts.ai
            ? { provider: opts.ai, apiKey: opts.key, model: opts.model }
            : undefined,
          report: {
            formats: ['pdf', 'json', 'markdown'],
            output: path.resolve(dir, opts.output ?? '.codesetter/reports'),
          },
        });

        if (!opts.json) {
          printHeader();
          console.log(`\n  ${chalk.bold('📁 Scanning:')} ${chalk.cyan(dir)}`);
          console.log(chalk.gray(`  Stack: ${config.path}\n`));
        }

        // ─── Run scanners with live progress ─────────────────────────────────
        const engine = new AuditEngine();
        const results: ScanResult[] = [];

        const categories = [
          'quality', 'security', 'performance',
          'accessibility', 'testing', 'architecture',
        ] as const;

        if (!opts.json) {
          console.log(chalk.gray('  Running scanners...\n'));
        }

        for (const category of categories) {
          if (config.scanners[category]?.enabled === false) continue;

          const spinner = opts.json ? null : createSpinner(`  Scanning ${category}...`);
          spinner?.start();

          try {
            const result = await engine.runScanner(category, config);
            results.push(result);
            spinner?.stop();

            if (!opts.json) {
              // Show live result per scanner
              const icon = CATEGORY_ICONS[category] ?? category;
              const count = result.issues.length;
              const crits = result.issues.filter((i) => i.severity === 'critical').length;
              const score = result.score;
              const scoreStr = chalk.hex(scoreColor(score)).bold(`${score}`);

              let suffix = chalk.gray(`${count} issue${count !== 1 ? 's' : ''}`);
              if (crits > 0) suffix += chalk.red(` ⚠ ${crits} critical`);

              console.log(`  ${chalk.green('✓')} ${chalk.white(icon)}  Score: ${scoreStr.padStart(3)}  ${suffix}`);
            }
          } catch {
            spinner?.stop();
          }
        }

        // ─── Build full report object ────────────────────────────────────────
        const { computeScore } = await import('../../scoring/scorer.js');
        const { detectStack } = await import('../../core/stack-detector.js');
        const { randomUUID } = await import('crypto');

        const stack = await detectStack(dir);
        const score = computeScore(results, config.scoring.weights);

        // Build summary
        const allIssues = results.flatMap((r) => r.issues);
        const report = {
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1.1.0',
          path: dir,
          stack,
          config,
          results,
          score,
          duration: 0,
          summary: {
            totalFiles: results.reduce((s, r) => s + r.filesScanned, 0),
            totalIssues: allIssues.length,
            criticalIssues: allIssues.filter((i) => i.severity === 'critical').length,
            highIssues:     allIssues.filter((i) => i.severity === 'high').length,
            mediumIssues:   allIssues.filter((i) => i.severity === 'medium').length,
            lowIssues:      allIssues.filter((i) => i.severity === 'low').length,
            infoIssues:     allIssues.filter((i) => i.severity === 'info').length,
            categories:     Object.fromEntries(results.map((r) => [r.category, r.issues.length])),
          },
        };

        // ─── AI Analysis ──────────────────────────────────────────────────────
        if (config.ai) {
          const aiSpinner = opts.json ? null : createSpinner('\n  🤖 Generating AI insights...');
          aiSpinner?.start();
          (report as typeof report & { ai?: unknown }).ai =
            (await runAIAnalysis(report as Parameters<typeof runAIAnalysis>[0], config.ai)) ?? undefined;
          aiSpinner?.stop();
        }

        // ─── JSON CI mode output ──────────────────────────────────────────────
        if (opts.json) {
          console.log(JSON.stringify({ score: report.score, summary: report.summary }, null, 2));
          if (report.summary.criticalIssues > 0) process.exitCode = 1;
          return;
        }

        // ─── Terminal: Score Report ───────────────────────────────────────────
        printScoreReport(score);
        printSummary(report as Parameters<typeof printSummary>[0]);

        // ─── Show top critical issues ─────────────────────────────────────────
        const criticals = allIssues.filter((i) => i.severity === 'critical').slice(0, 5);
        if (criticals.length > 0) {
          console.log(`  ${chalk.bold.red('🔴 Critical Issues:')}\n`);
          for (const issue of criticals) {
            console.log(`    ${chalk.red('▸')} ${chalk.white.bold(issue.title)}`);
            console.log(`      ${chalk.gray(issue.location.file + (issue.location.line ? ':' + issue.location.line : ''))}`);
            if (issue.fix) console.log(`      ${chalk.cyan('Fix:')} ${issue.fix.description}`);
            console.log('');
          }
        }

        // ─── Generate reports ─────────────────────────────────────────────────
        if (opts.noReport !== true) {
          const reportSpinner = createSpinner('  Generating reports...');
          reportSpinner.start();

          const reportPaths = await generateReports(
            report as Parameters<typeof generateReports>[0],
            {
              formats: ['pdf', 'json', 'markdown'],
              outputDir: config.report.output,
            }
          );
          reportSpinner.stop();

          console.log(`  ${chalk.bold('📄 Reports generated:')}`);
          if (reportPaths.pdf)      console.log(`    ${chalk.green('→')} PDF      ${chalk.cyan(reportPaths.pdf)}`);
          if (reportPaths.json)     console.log(`    ${chalk.green('→')} JSON     ${chalk.cyan(reportPaths.json)}`);
          if (reportPaths.markdown) console.log(`    ${chalk.green('→')} Markdown ${chalk.cyan(reportPaths.markdown)}`);
          console.log('');
        }

        // ─── Suggest fix ─────────────────────────────────────────────────────
        const fixableCount = allIssues.filter((i) => i.fix?.automated).length;
        if (fixableCount > 0) {
          console.log(
            chalk.hex('#6366f1')(
              `  💡 ${fixableCount} issues can be auto-fixed. Run: ${chalk.bold('codesetter fix')}\n`
            )
          );
        }

        if (report.summary.criticalIssues > 0) process.exitCode = 1;
      } catch (err) {
        printError((err as Error).message);
        process.exit(1);
      }
    });
}
