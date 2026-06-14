import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { Issue } from '../types/index.js';
import { readFileSafe, writeFile } from '../utils/file-utils.js';

export interface FixResult {
  file: string;
  issuesFixed: number;
  linesChanged: number;
  applied: boolean;
}

export interface AutoFixPlan {
  fixableIssues: Issue[];
  unfixableIssues: Issue[];
  fileChanges: Map<string, FileChange[]>;
}

export interface FileChange {
  issue: Issue;
  lineNumber: number;
  original: string;
  replacement: string;
  description: string;
}

/**
 * Build a fix plan from a list of issues.
 * Only issues with fix.automated === true are included.
 */
export async function buildFixPlan(
  issues: Issue[],
  baseDir: string
): Promise<AutoFixPlan> {
  const fixable = issues.filter((i) => i.fix?.automated === true && i.location.line !== undefined);
  const unfixable = issues.filter((i) => !i.fix?.automated || i.location.line === undefined);

  const fileChanges = new Map<string, FileChange[]>();

  for (const issue of fixable) {
    const absPath = path.resolve(baseDir, issue.location.file);
    const content = await readFileSafe(absPath);
    if (!content) continue;

    const lines = content.split('\n');
    const lineIdx = (issue.location.line ?? 1) - 1;
    const originalLine = lines[lineIdx];
    if (originalLine === undefined) continue;

    const change = buildChange(issue, originalLine);
    if (!change) continue;

    if (!fileChanges.has(absPath)) {
      fileChanges.set(absPath, []);
    }
    fileChanges.get(absPath)!.push({
      issue,
      lineNumber: lineIdx + 1,
      original: originalLine,
      replacement: change,
      description: issue.fix!.description,
    });
  }

  return { fixableIssues: fixable, unfixableIssues: unfixable, fileChanges };
}

/**
 * Generate the replacement line for a specific issue.
 */
function buildChange(issue: Issue, line: string): string | null {
  switch (issue.rule) {
    case 'no-console':
      // Comment out console.log/debug/info
      return line.replace(/^(\s*)(.*)$/, '$1// $2 // TODO: use a proper logger');

    case 'no-':
      // Remove statement entirely
      return line.replace(/\bdebugger\b\s*;?/, '').trimEnd();

    case 'img-alt':
      // Add alt="" to img tags missing alt
      return line.replace(/<img\b/, '<img alt=""');

    case 'label-for-input':
      // Add aria-label placeholder to inputs
      return line.replace(/<input\b/, '<input aria-label="TODO: add label"');

    case 'button-aria-label':
      // Add aria-label to icon-only buttons
      return line.replace(/<button\b/, '<button aria-label="TODO: describe action"');

    case 'html-has-lang':
      // Add lang="en" to html tag
      return line.replace(/<html\b/, '<html lang="en"');

    case 'no-eval':
      // Comment out eval usage
      return line.replace(/^(\s*)(.*)$/, '$1// $2 // SECURITY: replace eval() with safe alternative');

    default:
      return null;
  }
}

/**
 * Print a preview of all planned fixes with colored diffs.
 */
export function printFixPlan(plan: AutoFixPlan, baseDir: string): void {
  if (plan.fileChanges.size === 0) {
    console.log(chalk.yellow('\n  No auto-applicable fixes found in this scan.\n'));
    return;
  }

  let totalFixes = 0;
  console.log('');
  console.log(chalk.bold.cyan('  📋 Auto-Fix Preview'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));

  for (const [absPath, changes] of plan.fileChanges) {
    const relPath = path.relative(baseDir, absPath);
    console.log(`\n  ${chalk.bold.white(relPath)}`);

    for (const change of changes) {
      const sevColor = change.issue.severity === 'critical' || change.issue.severity === 'high'
        ? chalk.red : chalk.yellow;
      console.log(`    ${sevColor('•')} Line ${chalk.cyan(change.lineNumber)}: ${chalk.gray(change.issue.title)}`);
      console.log(`      ${chalk.red('- ')}${change.original.trim()}`);
      console.log(`      ${chalk.green('+ ')}${change.replacement.trim()}`);
      totalFixes++;
    }
  }

  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log(`  ${chalk.bold('Total:')} ${chalk.green(totalFixes)} fixes across ${chalk.cyan(plan.fileChanges.size)} files`);
  console.log(`  ${chalk.gray(`(${plan.unfixableIssues.length} issues require manual attention)`)}`);
  console.log('');
}

/**
 * Ask user for confirmation before applying fixes.
 */
export async function confirmFixes(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      chalk.cyan('  Apply these fixes to your codebase? ') + chalk.gray('(y/N) '),
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * Apply all planned fixes to disk.
 */
export async function applyFixes(plan: AutoFixPlan): Promise<FixResult[]> {
  const results: FixResult[] = [];

  for (const [absPath, changes] of plan.fileChanges) {
    const content = await readFileSafe(absPath);
    if (!content) {
      results.push({ file: absPath, issuesFixed: 0, linesChanged: 0, applied: false });
      continue;
    }

    const lines = content.split('\n');

    // Apply changes sorted by line number descending (to not shift line indices)
    const sorted = [...changes].sort((a, b) => b.lineNumber - a.lineNumber);
    let linesChanged = 0;

    for (const change of sorted) {
      const idx = change.lineNumber - 1;
      if (idx >= 0 && idx < lines.length) {
        lines[idx] = change.replacement;
        linesChanged++;
      }
    }

    await writeFile(absPath, lines.join('\n'));
    results.push({
      file: absPath,
      issuesFixed: changes.length,
      linesChanged,
      applied: true,
    });
  }

  return results;
}

/**
 * Print the results of applying fixes.
 */
export function printFixResults(results: FixResult[], baseDir: string): void {
  console.log('');
  console.log(chalk.bold.green('  ✅ Fixes Applied!'));
  console.log('');

  for (const r of results) {
    if (!r.applied) continue;
    const rel = path.relative(baseDir, r.file);
    console.log(`  ${chalk.green('✓')} ${rel} — ${chalk.cyan(r.issuesFixed)} fix${r.issuesFixed !== 1 ? 'es' : ''} applied`);
  }

  const total = results.reduce((s, r) => s + r.issuesFixed, 0);
  console.log('');
  console.log(
    `  ${chalk.bold(`${total} issues fixed`)} across ${results.length} files.`
  );
  console.log(chalk.gray(`  Run ${chalk.white('codesetter audit')} again to verify the improvements.\n`));
}
