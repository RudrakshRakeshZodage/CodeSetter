/**
 * CodeSetter — AI-powered repository auditing and optimization toolkit
 *
 * @example
 * import { auditProject, scanSecurity, generateReport } from 'codesetter';
 *
 * const report = await auditProject('./');
 * console.log(report.score.overall);
 */

// ─── Core types ───────────────────────────────────────────────────────────────
export type {
  AuditReport,
  ScanResult,
  Issue,
  ScoreReport,
  SubScore,
  StackInfo,
  CodeSetterConfig,
  AIConfig,
  AIAnalysis,
  AIInsight,
  FixSuggestion,
  IssueLocation,
  CodeSetterPlugin,
  Category,
  Severity,
  Grade,
  ReportFormat,
  AIProvider,
  DetectedStack,
} from './types/index.js';

// ─── Config ───────────────────────────────────────────────────────────────────
export { loadConfig } from './core/config.js';

// ─── Core engine ──────────────────────────────────────────────────────────────
export { AuditEngine } from './core/engine.js';
export { detectStack } from './core/stack-detector.js';

// ─── Scanners ─────────────────────────────────────────────────────────────────
export { QualityScanner } from './scanners/quality/quality-scanner.js';
export { SecurityScanner } from './scanners/security/security-scanner.js';
export { PerformanceScanner } from './scanners/performance/performance-scanner.js';
export { AccessibilityScanner } from './scanners/accessibility/accessibility-scanner.js';
export { TestingScanner } from './scanners/testing/testing-scanner.js';
export { ArchitectureScanner } from './scanners/architecture/architecture-scanner.js';

// ─── Scoring ──────────────────────────────────────────────────────────────────
export { computeScore, scoreToGrade, scoreColor, gradeColor } from './scoring/scorer.js';

// ─── Reports ──────────────────────────────────────────────────────────────────
export { generateReports } from './reports/report-manager.js';
export { generateHtmlReport } from './reports/html-reporter.js';
export { generateJsonReport } from './reports/json-reporter.js';
export { generateMarkdownReport } from './reports/markdown-reporter.js';

// ─── AI ───────────────────────────────────────────────────────────────────────
export { runAIAnalysis, createAIClient } from './ai/ai-analyzer.js';

// ─── Plugins ──────────────────────────────────────────────────────────────────
export { registerPlugin, pluginManager } from './plugins/plugin-manager.js';

// ─── High-level SDK functions ─────────────────────────────────────────────────

import { AuditEngine } from './core/engine.js';
import { loadConfig } from './core/config.js';
import { generateReports } from './reports/report-manager.js';
import { runAIAnalysis } from './ai/ai-analyzer.js';
import type { AuditReport, CodeSetterConfig, ScanResult, Category, ReportFormat } from './types/index.js';

/**
 * Run a full audit on a project directory.
 *
 * @param path - Path to the project root
 * @param config - Optional configuration overrides
 * @returns Full audit report with scores, issues, and recommendations
 *
 * @example
 * const report = await auditProject('./my-project');
 * console.log(`Score: ${report.score.overall}/100`);
 */
export async function auditProject(
  path: string,
  config?: Partial<CodeSetterConfig>
): Promise<AuditReport> {
  const cfg = await loadConfig(path, config ?? {});
  const engine = new AuditEngine();
  const report = await engine.run(cfg);

  if (cfg.ai) {
    report.ai = (await runAIAnalysis(report, cfg.ai)) ?? undefined;
  }

  return report;
}

/**
 * Run a single scanner on a directory.
 *
 * @example
 * const result = await scanSecurity('./src');
 */
export async function runScanner(
  category: Category,
  path: string,
  config?: Partial<CodeSetterConfig>
): Promise<ScanResult> {
  const cfg = await loadConfig(path, config ?? {});
  const engine = new AuditEngine();
  return engine.runScanner(category, cfg);
}

/**
 * Convenience: scan security only.
 */
export async function scanSecurity(path: string, config?: Partial<CodeSetterConfig>): Promise<ScanResult> {
  return runScanner('security', path, config);
}

/**
 * Convenience: scan quality only.
 */
export async function scanQuality(path: string, config?: Partial<CodeSetterConfig>): Promise<ScanResult> {
  return runScanner('quality', path, config);
}

/**
 * Convenience: scan performance only.
 */
export async function scanPerformance(path: string, config?: Partial<CodeSetterConfig>): Promise<ScanResult> {
  return runScanner('performance', path, config);
}

/**
 * Convenience: scan testing only.
 */
export async function scanTesting(path: string, config?: Partial<CodeSetterConfig>): Promise<ScanResult> {
  return runScanner('testing', path, config);
}

/**
 * Convenience: scan accessibility only.
 */
export async function scanAccessibility(path: string, config?: Partial<CodeSetterConfig>): Promise<ScanResult> {
  return runScanner('accessibility', path, config);
}

/**
 * Generate reports from an existing AuditReport.
 *
 * @example
 * const report = await auditProject('./');
 * await generateReport(report, { formats: ['html', 'json'], outputDir: '.codesetter/reports' });
 */
export async function generateReport(
  report: AuditReport,
  options: { formats?: ReportFormat[]; outputDir?: string }
): Promise<Record<string, string>> {
  return generateReports(report, {
    formats: options.formats ?? ['html', 'json', 'markdown'],
    outputDir: options.outputDir ?? '.codesetter/reports',
  }) as Promise<Record<string, string>>;
}
