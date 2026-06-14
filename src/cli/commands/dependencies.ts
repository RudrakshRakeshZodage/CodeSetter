import { Command } from 'commander';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { printHeader, printError, createSpinner } from '../ui/display.js';
import { resolvePath } from '../../utils/file-utils.js';

export function registerDependenciesCommand(program: Command): void {
  program
    .command('dependencies [path]')
    .description('Run npm audit and check for vulnerable dependencies')
    .option('--json', 'Output results as JSON')
    .action(async (targetPath: string | undefined, opts: { json?: boolean }) => {
      const dir = resolvePath(targetPath ?? '.');

      try {
        if (!opts.json) {
          printHeader();
          console.log(`  Checking dependencies in: ${dir}\n`);
        }

        const spinner = opts.json ? null : createSpinner('Running npm audit...');
        spinner?.start();

        let auditOutput: string;
        try {
          auditOutput = execSync('npm audit --json', {
            cwd: dir,
            timeout: 30000,
            stdio: ['pipe', 'pipe', 'pipe'],
          }).toString();
        } catch (e: unknown) {
          // npm audit exits with non-zero if vulnerabilities found
          auditOutput = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
        }

        spinner?.stop();

        if (opts.json) {
          console.log(auditOutput);
          return;
        }

        try {
          const data = JSON.parse(auditOutput) as {
            metadata?: { vulnerabilities?: Record<string, number> };
            vulnerabilities?: Record<string, { severity: string; title?: string; name: string }>;
          };

          const vulns = data.metadata?.vulnerabilities ?? {};
          const total = Object.values(vulns).reduce((a, b) => a + b, 0);

          if (total === 0) {
            console.log(`  ${chalk.green('✓')} No vulnerabilities found!\n`);
          } else {
            console.log(`  ${chalk.red('✗')} ${total} vulnerabilities found:\n`);
            for (const [severity, count] of Object.entries(vulns)) {
              if ((count as number) > 0) {
                console.log(`    ${severity.padEnd(10)} ${count}`);
              }
            }
            console.log('');
            console.log(chalk.cyan('  Run: npm audit fix\n'));
          }
        } catch {
          console.log(auditOutput);
        }
      } catch (err) {
        printError((err as Error).message);
        process.exit(1);
      }
    });
}
