import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import path from 'path';
import { writeFile, resolvePath } from '../../utils/file-utils.js';
import { printHeader } from '../ui/display.js';

interface InitAnswers {
  stack: string;
  aiProvider: string;
  apiKey: string;
  outputDir: string;
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

function askSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();

    let input = '';
    const onData = (char: Buffer) => {
      const c = char.toString();
      if (c === '\r' || c === '\n') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (c === '\u0003') {
        // Ctrl+C
        process.exit();
      } else if (c === '\u007f') {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += c;
        process.stdout.write('*');
      }
    };
    process.stdin.on('data', onData);
  });
}

function menu(rl: readline.Interface, question: string, options: string[]): Promise<string> {
  console.log('');
  console.log(chalk.cyan(question));
  options.forEach((opt, i) => {
    console.log(`  ${chalk.white(`[${i + 1}]`)} ${opt}`);
  });
  return new Promise((resolve) => {
    rl.question(chalk.gray('  Enter number: '), (answer) => {
      const idx = parseInt(answer.trim()) - 1;
      resolve(options[idx] ?? options[0]);
    });
  });
}

export function registerInitCommand(program: Command): void {
  program
    .command('init [path]')
    .description('Interactive setup wizard — configure CodeSetter for your project')
    .action(async (targetPath?: string) => {
      const dir = resolvePath(targetPath ?? '.');

      printHeader();
      console.log('');
      console.log(chalk.bold('  🚀 Welcome to CodeSetter Setup'));
      console.log(chalk.gray('  Answer a few questions to configure your project.\n'));

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // 1. Stack
      const stackChoice = await menu(rl, 'What is your primary codebase language/stack?', [
        'TypeScript',
        'JavaScript',
        'React / Next.js',
        'Vue',
        'Angular',
        'Node.js / Express',
        'NestJS',
        'Other',
      ]);

      // 2. AI Provider
      const providerChoice = await menu(rl, 'Which AI provider would you like to use?', [
        'Google Gemini (free tier available)',
        'OpenAI (GPT-4)',
        'Ollama (local, no key needed)',
        'None (skip AI)',
      ]);

      const providerMap: Record<string, string> = {
        'Google Gemini (free tier available)': 'gemini',
        'OpenAI (GPT-4)':                     'openai',
        'Ollama (local, no key needed)':       'ollama',
        'None (skip AI)':                      'none',
      };
      const provider = providerMap[providerChoice] ?? 'none';

      // 3. API Key
      let apiKey = '';
      if (provider === 'gemini' || provider === 'openai') {
        rl.pause();
        const keyPrompt =
          provider === 'gemini'
            ? `\n  Enter your Gemini API key (get one at aistudio.google.com): `
            : `\n  Enter your OpenAI API key (sk-...): `;
        apiKey = await askSecret(chalk.cyan(keyPrompt));
        rl.resume();
      }

      // 4. Output dir
      console.log('');
      const outputDirInput = await ask(
        rl,
        chalk.cyan(`  Report output directory? `) + chalk.gray('(default: .codesetter/reports) ')
      );
      const outputDir = outputDirInput || '.codesetter/reports';

      rl.close();

      // Build config
      const config: Record<string, unknown> = {
        ignore: ['node_modules', 'dist', 'build', '.next', 'coverage'],
        severity: 'low',
        scanners: {
          quality:       { enabled: true },
          security:      { enabled: true },
          performance:   { enabled: true },
          accessibility: { enabled: true },
          testing:       { enabled: true },
          architecture:  { enabled: true },
        },
        scoring: {
          weights: {
            quality:       0.1667,
            security:      0.1667,
            performance:   0.1667,
            accessibility: 0.1667,
            testing:       0.1667,
            architecture:  0.1665,
          },
        },
        report: {
          formats: ['pdf', 'json', 'markdown'],
          output: outputDir,
        },
      };

      if (provider !== 'none') {
        config.ai = {
          provider,
          ...(apiKey ? { apiKey } : {}),
        };
      }

      const rcPath = path.join(dir, '.codesetterrc.json');
      await writeFile(rcPath, JSON.stringify(config, null, 2));

      console.log('');
      console.log(chalk.green('  ✓ Configuration saved to .codesetterrc.json'));
      console.log('');
      console.log(chalk.bold('  Next steps:'));
      console.log(`    ${chalk.cyan('codesetter audit')}      — run full audit`);
      console.log(`    ${chalk.cyan('codesetter score')}      — quick score view`);
      console.log(`    ${chalk.cyan('codesetter fix')}        — auto-fix detected issues`);
      console.log('');

      // Show detected stack info
      console.log(chalk.gray(`  Stack: ${stackChoice}`));
      console.log(chalk.gray(`  AI:    ${provider === 'none' ? 'disabled' : providerChoice}`));
      console.log(chalk.gray(`  Reports: ${outputDir}/pdf/ · ${outputDir}/json/ · ${outputDir}/markdown/`));
      console.log('');
    });
}
