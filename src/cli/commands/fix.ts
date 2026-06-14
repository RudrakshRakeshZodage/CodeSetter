import { Command } from 'commander';
import chalk from 'chalk';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { runAIAnalysis } from '../../ai/ai-analyzer.js';
import { printHeader, printError, createSpinner } from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';
import type { AIProvider } from '../../types/index.js';

export function registerFixCommand(program: Command): void {
  program
    .command('fix [path]')
    .description('Show AI-powered fix suggestions for critical and high severity issues')
    .option('--ai <provider>', 'AI provider: openai | gemini | ollama', 'gemini')
    .option('--key <apiKey>', 'AI API key')
    .option('--model <model>', 'AI model')
    .option('--json', 'Output as JSON')
    .action(
      async (
        targetPath: string | undefined,
        opts: { ai?: string; key?: string; model?: string; json?: boolean }
      ) => {
        const dir = resolvePath(targetPath ?? '.');

        try {
          const config = await loadConfig(dir, {
            ai: {
              provider: (opts.ai ?? 'gemini') as AIProvider,
              apiKey: opts.key ?? process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY,
              model: opts.model,
            },
          });

          if (!opts.json) {
            printHeader();
            console.log(`  Generating AI fix suggestions for: ${dir}\n`);
          }

          const spinner = opts.json ? null : createSpinner('Scanning project...');
          spinner?.start();

          const engine = new AuditEngine();
          const report = await engine.run(config);

          spinner && (spinner.text = 'Sending to AI...');

          const aiAnalysis = await runAIAnalysis(report, config.ai!);

          spinner?.stop();

          if (!aiAnalysis) {
            printError('AI analysis failed. Check your API key and provider.');
            process.exit(1);
          }

          if (opts.json) {
            console.log(JSON.stringify(aiAnalysis, null, 2));
            return;
          }

          // Print AI insights
          console.log(`  ${chalk.bold('🤖 AI Analysis')} (${config.ai!.provider})\n`);
          console.log(`  ${chalk.white(aiAnalysis.overallSummary)}\n`);

          console.log(`  ${chalk.bold('Priority Actions:')}`);
          for (const action of aiAnalysis.priorityActions) {
            console.log(`    ${chalk.cyan('→')} ${action}`);
          }
          console.log('');

          for (const insight of aiAnalysis.insights) {
            console.log(`  ${chalk.bold(`📌 ${insight.category}`)}`);
            console.log(`  ${chalk.gray(insight.summary)}`);
            for (const suggestion of insight.suggestions.slice(0, 3)) {
              console.log(`    • ${suggestion}`);
            }
            if (insight.codeExamples?.length) {
              const ex = insight.codeExamples[0];
              console.log('');
              console.log(chalk.gray('  Before:'));
              console.log(chalk.red(`    ${ex.before}`));
              console.log(chalk.gray('  After:'));
              console.log(chalk.green(`    ${ex.after}`));
            }
            console.log('');
          }

          console.log(`  ${chalk.gray('Estimated fix time:')} ${chalk.white(aiAnalysis.estimatedFixTime)}`);
          console.log('');
        } catch (err) {
          printError((err as Error).message);
          process.exit(1);
        }
      }
    );
}
