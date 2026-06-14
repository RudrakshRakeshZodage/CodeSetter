import { randomUUID } from 'crypto';
import { AuditReport, CodeSetterConfig, ScanResult, AuditSummary, Category } from '../types/index.js';
import { detectStack } from './stack-detector.js';
import { computeScore } from '../scoring/scorer.js';
import { pluginManager } from '../plugins/plugin-manager.js';
import { logger } from '../utils/logger.js';
import { resetProject } from '../utils/ast-utils.js';

// Lazy-loaded scanners (avoid initializing if disabled)
async function loadQualityScanner() {
  const { QualityScanner } = await import('../scanners/quality/quality-scanner.js');
  return new QualityScanner();
}
async function loadSecurityScanner() {
  const { SecurityScanner } = await import('../scanners/security/security-scanner.js');
  return new SecurityScanner();
}
async function loadPerformanceScanner() {
  const { PerformanceScanner } = await import('../scanners/performance/performance-scanner.js');
  return new PerformanceScanner();
}
async function loadAccessibilityScanner() {
  const { AccessibilityScanner } = await import('../scanners/accessibility/accessibility-scanner.js');
  return new AccessibilityScanner();
}
async function loadTestingScanner() {
  const { TestingScanner } = await import('../scanners/testing/testing-scanner.js');
  return new TestingScanner();
}
async function loadArchitectureScanner() {
  const { ArchitectureScanner } = await import('../scanners/architecture/architecture-scanner.js');
  return new ArchitectureScanner();
}

export interface ScannerBase {
  scan(dir: string, config: CodeSetterConfig): Promise<ScanResult>;
}

/**
 * Main audit engine that orchestrates all scanners and produces the final AuditReport.
 */
export class AuditEngine {
  async run(config: CodeSetterConfig): Promise<AuditReport> {
    const start = Date.now();
    resetProject();

    logger.info(`Scanning: ${config.path}`);

    // Detect stack
    const stack = await detectStack(config.path);
    logger.debug(`Stack detected: ${stack.primary} (${stack.frameworks.join(', ')})`);

    // Build enabled scanners list
    const scanners: Array<{ category: Category; loader: () => Promise<ScannerBase> }> = [];

    if (config.scanners.quality?.enabled !== false) {
      scanners.push({ category: 'quality', loader: loadQualityScanner });
    }
    if (config.scanners.security?.enabled !== false) {
      scanners.push({ category: 'security', loader: loadSecurityScanner });
    }
    if (config.scanners.performance?.enabled !== false) {
      scanners.push({ category: 'performance', loader: loadPerformanceScanner });
    }
    if (config.scanners.accessibility?.enabled !== false) {
      scanners.push({ category: 'accessibility', loader: loadAccessibilityScanner });
    }
    if (config.scanners.testing?.enabled !== false) {
      scanners.push({ category: 'testing', loader: loadTestingScanner });
    }
    if (config.scanners.architecture?.enabled !== false) {
      scanners.push({ category: 'architecture', loader: loadArchitectureScanner });
    }

    // Run scanners
    const results: ScanResult[] = [];

    for (const { loader } of scanners) {
      try {
        const scanner = await loader();
        const result = await scanner.scan(config.path, config);
        results.push(result);
        logger.debug(`Scanner done: ${result.category} — ${result.issues.length} issues`);
      } catch (err) {
        logger.warn(`Scanner failed: ${(err as Error).message}`);
      }
    }

    // Run plugins
    const pluginResults = await pluginManager.runAll(config);
    results.push(...pluginResults);

    // Compute score
    const score = computeScore(results, config.scoring.weights);

    // Build summary
    const summary = buildSummary(results);

    const report: AuditReport = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      path: config.path,
      stack,
      config,
      results,
      score,
      duration: Date.now() - start,
      summary,
    };

    return report;
  }

  /**
   * Run only a single scanner by category.
   */
  async runScanner(category: Category, config: CodeSetterConfig): Promise<ScanResult> {
    const loaderMap: Record<string, () => Promise<ScannerBase>> = {
      quality: loadQualityScanner,
      security: loadSecurityScanner,
      performance: loadPerformanceScanner,
      accessibility: loadAccessibilityScanner,
      testing: loadTestingScanner,
      architecture: loadArchitectureScanner,
    };

    const loader = loaderMap[category];
    if (!loader) throw new Error(`Unknown scanner category: ${category}`);

    const scanner = await loader();
    return scanner.scan(config.path, config);
  }
}

function buildSummary(results: ScanResult[]): AuditSummary {
  const allIssues = results.flatMap((r) => r.issues);

  const categories = {} as Record<Category, number>;
  for (const result of results) {
    categories[result.category] = result.issues.length;
  }

  return {
    totalFiles: results.reduce((sum, r) => sum + r.filesScanned, 0),
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter((i) => i.severity === 'critical').length,
    highIssues: allIssues.filter((i) => i.severity === 'high').length,
    mediumIssues: allIssues.filter((i) => i.severity === 'medium').length,
    lowIssues: allIssues.filter((i) => i.severity === 'low').length,
    infoIssues: allIssues.filter((i) => i.severity === 'info').length,
    categories,
  };
}
