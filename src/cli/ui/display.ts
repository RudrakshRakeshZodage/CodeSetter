import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { AuditReport, ScoreReport, ScanResult, Category, SubScore } from '../../types/index.js';
import { scoreColor } from '../../scoring/scorer.js';

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function createSpinner(text: string): Ora {
  return ora({ text, color: 'magenta' });
}

// ─── Score display ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  quality: '🔍',
  security: '🛡️',
  performance: '⚡',
  accessibility: '♿',
  testing: '🧪',
  architecture: '🏗️',
  dependencies: '📦',
};

function scoreBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const color = scoreColor(score);
  return chalk.hex(color)('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function gradeChalk(grade: string): string {
  if (grade.startsWith('A')) return chalk.greenBright(grade);
  if (grade.startsWith('B')) return chalk.blueBright(grade);
  if (grade.startsWith('C')) return chalk.yellowBright(grade);
  if (grade === 'D') return chalk.hex('#f97316')(grade);
  return chalk.redBright(grade);
}

export function printHeader(): void {
  console.log('');
  console.log(
    chalk.hex('#6366f1').bold('  ⚡ CodeSetter') + chalk.gray(' — AI-Powered Code Auditor')
  );
  console.log(chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

export function printScoreReport(score: ScoreReport): void {
  console.log('');
  console.log(chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(
    `  ${chalk.bold('OVERALL SCORE:')} ${chalk.hex(scoreColor(score.overall)).bold(`${score.overall}/100`)}  ${gradeChalk(score.grade)}`
  );
  console.log(chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  for (const [cat, sub] of Object.entries(score.subScores) as [Category, SubScore][]) {
    const icon = CATEGORY_ICONS[cat] ?? '•';
    const label = `${icon} ${cat.padEnd(14)}`;
    const bar = scoreBar(sub.score);
    const scoreStr = chalk.hex(scoreColor(sub.score)).bold(`${sub.score}`);
    const issueStr = sub.issueCount > 0 ? chalk.gray(` (${sub.issueCount} issues)`) : '';
    console.log(`    ${chalk.white(label)} ${bar}  ${scoreStr}${issueStr}`);
  }

  console.log('');
}

export function printSummary(report: AuditReport): void {
  const { summary } = report;
  const duration = (report.duration / 1000).toFixed(1);

  console.log(`  ${chalk.bold('Summary')}:`);
  console.log(`    Files scanned:  ${chalk.white(summary.totalFiles)}`);
  console.log(`    Total issues:   ${chalk.white(summary.totalIssues)}`);

  if (summary.criticalIssues > 0) {
    console.log(`    🔴 Critical:    ${chalk.redBright.bold(summary.criticalIssues)}`);
  }
  if (summary.highIssues > 0) {
    console.log(`    🟠 High:        ${chalk.hex('#f97316')(summary.highIssues)}`);
  }
  if (summary.mediumIssues > 0) {
    console.log(`    🟡 Medium:      ${chalk.yellow(summary.mediumIssues)}`);
  }
  if (summary.lowIssues > 0) {
    console.log(`    🔵 Low:         ${chalk.blue(summary.lowIssues)}`);
  }

  console.log(`    Duration:       ${chalk.gray(duration + 's')}`);
  console.log('');
}

export function printScanResult(result: ScanResult): void {
  const icon = CATEGORY_ICONS[result.category] ?? '•';
  const count = result.issues.length;
  const criticals = result.issues.filter((i) => i.severity === 'critical').length;

  let suffix = chalk.gray(`${count} issue${count !== 1 ? 's' : ''} found`);
  if (criticals > 0) {
    suffix += chalk.redBright(` (${criticals} critical)`);
  }

  console.log(`  ${chalk.green('✓')} ${icon} ${chalk.white(result.category.padEnd(18))} ${suffix}`);
}

export function printIssues(result: ScanResult, maxIssues = 10): void {
  const SEVERITY_COLORS: Record<string, chalk.Chalk> = {
    critical: chalk.bgRed.white,
    high: chalk.hex('#f97316'),
    medium: chalk.yellow,
    low: chalk.blue,
    info: chalk.gray,
  };

  const sorted = result.issues
    .sort((a, b) => {
      const order = ['critical', 'high', 'medium', 'low', 'info'];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    })
    .slice(0, maxIssues);

  for (const issue of sorted) {
    const sev = SEVERITY_COLORS[issue.severity] ?? chalk.white;
    const sevLabel = sev(` ${issue.severity.toUpperCase().padEnd(8)} `);
    const location = chalk.gray(
      `${issue.location.file}${issue.location.line ? ':' + issue.location.line : ''}`
    );

    console.log(`    ${sevLabel} ${chalk.white(issue.title)}`);
    console.log(`              ${chalk.gray(issue.description)}`);
    console.log(`              ${location}`);
    if (issue.fix) {
      console.log(`              ${chalk.cyan('→')} ${chalk.cyan(issue.fix.description)}`);
    }
    console.log('');
  }

  if (result.issues.length > maxIssues) {
    console.log(chalk.gray(`    ... and ${result.issues.length - maxIssues} more issues. See the full report.`));
    console.log('');
  }
}

export function printReportPaths(paths: Record<string, string>): void {
  console.log(`  ${chalk.bold('📄 Reports generated:')}`);
  for (const [format, filePath] of Object.entries(paths)) {
    console.log(`    ${chalk.green('→')} ${format.padEnd(8)} ${chalk.cyan(filePath)}`);
  }
  console.log('');
}

export function printError(message: string): void {
  console.error(`\n  ${chalk.red('✗')} ${chalk.red(message)}\n`);
}

export function printSuccess(message: string): void {
  console.log(`\n  ${chalk.green('✓')} ${chalk.green(message)}\n`);
}
