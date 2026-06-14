import path from 'path';
import { ScanResult, Issue, CodeSetterConfig } from '../../types/index.js';
import { walkFiles, walkTestFiles, inferTestFilePath } from '../../core/file-walker.js';
import { fileExists, relativePath, readFileSafe } from '../../utils/file-utils.js';

const CRITICAL_MODULE_PATTERNS = [
  /auth/i,
  /login/i,
  /register/i,
  /password/i,
  /payment/i,
  /checkout/i,
  /database|db/i,
  /api/i,
  /middleware/i,
  /controller/i,
  /service/i,
  /repository/i,
];

export class TestingScanner {
  async scan(dir: string, config: CodeSetterConfig): Promise<ScanResult> {
    const start = Date.now();

    const sourceFiles = await walkFiles(dir, {
      extensions: ['ts', 'tsx', 'js', 'jsx'],
      ignore: config.ignore,
      includeTests: false,
    });

    const testFiles = await walkTestFiles(dir);
    const issues: Issue[] = [];

    // ─── Files without tests ──────────────────────────────────────────────
    let untestedCount = 0;
    const untestedCritical: string[] = [];

    for (const sourceFile of sourceFiles) {
      const relFile = relativePath(sourceFile, dir);
      const possibleTestPaths = inferTestFilePath(sourceFile);

      const hasTest = (await Promise.all(possibleTestPaths.map(fileExists))).some(Boolean);

      if (!hasTest) {
        untestedCount++;

        const isCritical = CRITICAL_MODULE_PATTERNS.some((p) => p.test(relFile));

        if (isCritical) {
          untestedCritical.push(relFile);
          issues.push({
            id: `testing-untested-critical-${relFile}`,
            category: 'testing',
            severity: 'high',
            title: 'Critical Module Without Tests',
            description: `"${relFile}" appears to be a critical module (auth/db/payment) with no test file.`,
            location: { file: relFile },
            rule: 'no-untested-critical',
            fix: {
              description: `Create test file: ${possibleTestPaths[0].replace(dir + path.sep, '')}`,
              automated: false,
            },
            effort: 'hard',
            impact: 'high',
          });
        } else if (untestedCount <= 20) {
          // Limit noise — report first 20 only
          issues.push({
            id: `testing-missing-test-${relFile}`,
            category: 'testing',
            severity: 'low',
            title: 'Missing Test File',
            description: `No test file found for "${relFile}".`,
            location: { file: relFile },
            rule: 'require-tests',
            fix: {
              description: `Create: ${possibleTestPaths[0].replace(dir + path.sep, '')}`,
              automated: false,
            },
            effort: 'medium',
            impact: 'medium',
          });
        }
      }
    }

    // ─── Coverage estimation ──────────────────────────────────────────────
    const coveredFiles = sourceFiles.length - untestedCount;
    const coverageEstimate =
      sourceFiles.length > 0 ? Math.round((coveredFiles / sourceFiles.length) * 100) : 100;

    if (coverageEstimate < 50) {
      issues.push({
        id: 'testing-low-coverage',
        category: 'testing',
        severity: 'high',
        title: 'Low Test Coverage',
        description: `Estimated test coverage: ${coverageEstimate}%. Aim for ≥ 70%.`,
        location: { file: 'project-wide' },
        rule: 'min-coverage',
        fix: {
          description: 'Add unit tests for untested modules, especially critical ones',
          automated: false,
        },
        effort: 'hard',
        impact: 'high',
      });
    } else if (coverageEstimate < 70) {
      issues.push({
        id: 'testing-medium-coverage',
        category: 'testing',
        severity: 'medium',
        title: 'Moderate Test Coverage',
        description: `Estimated test coverage: ${coverageEstimate}%. Recommended: ≥ 70%.`,
        location: { file: 'project-wide' },
        rule: 'min-coverage',
        fix: {
          description: 'Add tests for uncovered modules',
          automated: false,
        },
        effort: 'hard',
        impact: 'medium',
      });
    }

    // ─── Test file quality checks ─────────────────────────────────────────
    for (const testFile of testFiles) {
      const content = await readFileSafe(testFile);
      if (!content) continue;

      const relFile = relativePath(testFile, dir);

      // Empty test files
      const testCount = (content.match(/\b(?:it|test)\s*\(/g) ?? []).length;
      if (testCount === 0) {
        issues.push({
          id: `testing-empty-test-${relFile}`,
          category: 'testing',
          severity: 'medium',
          title: 'Empty Test File',
          description: `Test file "${relFile}" has no test cases.`,
          location: { file: relFile },
          rule: 'no-empty-tests',
          fix: {
            description: 'Add actual test cases to this test file',
            automated: false,
          },
          effort: 'medium',
          impact: 'medium',
        });
      }

      // Tests without assertions
      const describeBlocks = content.match(/\b(?:it|test)\s*\([^,]+,\s*(?:async\s*)?\(\)\s*=>\s*\{([^}]*)\}/g) ?? [];
      for (const block of describeBlocks) {
        const hasAssertion = /expect|assert|should/.test(block);
        if (!hasAssertion) {
          issues.push({
            id: `testing-no-assertion-${relFile}`,
            category: 'testing',
            severity: 'medium',
            title: 'Test Without Assertion',
            description: 'Test case found with no assertion (expect/assert/should).',
            location: { file: relFile },
            rule: 'require-assertions',
            fix: {
              description: 'Add at least one expect() assertion per test case',
              automated: false,
            },
            effort: 'easy',
            impact: 'medium',
          });
          break; // One per file
        }
      }
    }

    // ─── No test framework found ──────────────────────────────────────────
    if (testFiles.length === 0 && sourceFiles.length > 5) {
      issues.push({
        id: 'testing-no-framework',
        category: 'testing',
        severity: 'critical',
        title: 'No Tests Found',
        description: 'No test files found in the project. Testing is essential for maintainability.',
        location: { file: 'project-wide' },
        rule: 'require-tests',
        fix: {
          description: 'Set up Vitest: npm install -D vitest && add test scripts',
          automated: false,
        },
        effort: 'hard',
        impact: 'high',
      });
    }

    const score = computeTestingScore(issues, coverageEstimate, sourceFiles.length);

    return {
      category: 'testing',
      issues,
      score,
      filesScanned: sourceFiles.length,
      duration: Date.now() - start,
      metadata: {
        sourceFiles: sourceFiles.length,
        testFiles: testFiles.length,
        untestedFiles: untestedCount,
        coverageEstimate: `${coverageEstimate}%`,
        untestedCritical,
      },
    };
  }
}

function computeTestingScore(
  issues: Issue[],
  coverageEstimate: number,
  fileCount: number
): number {
  if (fileCount === 0) return 100;

  // Base from coverage
  const coverageScore = Math.min(100, coverageEstimate * 1.2);

  // Penalty from issues
  const penalties = { critical: 25, high: 10, medium: 4, low: 1, info: 0 };
  const totalPenalty = issues.reduce((sum, i) => sum + (penalties[i.severity] ?? 0), 0);

  return Math.max(0, Math.min(100, coverageScore - totalPenalty * 0.3));
}
