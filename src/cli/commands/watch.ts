import { Command } from 'commander';
import chalk from 'chalk';
import chokidar from 'chokidar';
import path from 'path';
import { AuditEngine } from '../../core/engine.js';
import { loadConfig } from '../../core/config.js';
import { resolvePath, relativePath } from '../../utils/file-utils.js';
import { printHeader, printScoreReport, createSpinner, printError } from '../ui/display.js';
import { buildFixPlan, applyFixes, printFixResults } from '../../fixers/auto-fixer.js';

export function registerWatchCommand(program: Command): void {
  program
    .command('watch [path]')
    .description('Run continuously and auto-fix code in real-time as files change')
    .action(async (targetPath: string | undefined) => {
      const dir = resolvePath(targetPath ?? '.');
      
      try {
        const config = await loadConfig(dir);
        
        console.clear();
        printHeader();
        console.log(`\n  ${chalk.bold.magenta('👀 Watch Mode Active:')} ${chalk.cyan(dir)}`);
        console.log(chalk.gray(`  Listening for file changes and auto-fixing in real-time...\n`));

        const engine = new AuditEngine();
        
        const initialSpinner = createSpinner('Running initial scan...');
        initialSpinner.start();
        const initialReport = await engine.run(config);
        initialSpinner.stop();
        printScoreReport(initialReport.score);
        console.log(chalk.gray(`  Listening for file changes...\n`));

        const ignoreList = [
          ...(config.ignore ?? []),
          '**/node_modules/**',
          '**/.codesetter/**',
          '**/dist/**',
          '.git/**'
        ];

        const watcher = chokidar.watch(dir, {
          ignored: ignoreList,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100
          }
        });

        let isScanning = false;

        watcher.on('change', async (filePath) => {
          if (isScanning) return;
          isScanning = true;

          console.clear();
          printHeader();
          
          const fileRel = relativePath(filePath, dir).replace(/\\/g, '/');
          console.log(`\n  ${chalk.magenta('↻ File saved:')} ${chalk.cyan(fileRel)}\n`);
          
          const spinner = createSpinner('Scanning and fixing...');
          spinner.start();
          
          try {
             const report = await engine.run(config);
             
             // Match files by checking if issue file path ends with the modified file
             // Replace windows backslashes just in case
             const fileIssues = report.results
               .flatMap((r) => r.issues)
               .filter((i) => {
                 const iFile = i.location.file.replace(/\\/g, '/');
                 return iFile === fileRel || fileRel.endsWith(iFile);
               });
             
             if (fileIssues.length > 0) {
                 const plan = await buildFixPlan(fileIssues, dir);
                 if (plan.fileChanges.size > 0) {
                     const results = await applyFixes(plan);
                     spinner.stop();
                     printFixResults(results, dir);
                 } else {
                     spinner.stop();
                     console.log(chalk.yellow(`  ⚠️  Found issues in ${fileRel}, but none were auto-fixable.`));
                 }
             } else {
                 spinner.stop();
                 console.log(chalk.green(`  ✓ Clean: No issues found in ${fileRel}.`));
             }
             
             console.log('');
             printScoreReport(report.score);
          } catch (e) {
             spinner.stop();
             printError(`Error scanning: ${(e as Error).message}`);
          } finally {
             console.log(chalk.gray(`  Listening for file changes...\n`));
             // Debounce cooldown
             setTimeout(() => { isScanning = false; }, 500);
          }
        });

      } catch (err) {
        printError((err as Error).message);
        process.exit(1);
      }
    });
}
