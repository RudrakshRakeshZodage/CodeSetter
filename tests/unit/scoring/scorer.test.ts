import { describe, it, expect } from 'vitest';
import { computeScore, scoreToGrade } from '../../../src/scoring/scorer.js';
import type { ScanResult } from '../../../src/types/index.js';

function makeScanResult(category: ScanResult['category'], score: number, issueCount = 0): ScanResult {
  return {
    category,
    score,
    issues: Array.from({ length: issueCount }, (_, i) => ({
      id: `test-${i}`,
      category,
      severity: 'medium' as const,
      title: 'Test issue',
      description: 'Test',
      location: { file: 'test.ts' },
    })),
    filesScanned: 10,
    duration: 100,
  };
}

describe('computeScore', () => {
  it('should return overall score as weighted average', () => {
    const results: ScanResult[] = [
      makeScanResult('quality', 80),
      makeScanResult('security', 90),
      makeScanResult('performance', 70),
      makeScanResult('accessibility', 60),
      makeScanResult('testing', 75),
      makeScanResult('architecture', 85),
    ];

    const report = computeScore(results);
    expect(report.overall).toBeGreaterThan(0);
    expect(report.overall).toBeLessThanOrEqual(100);
  });

  it('should give security higher weight than accessibility', () => {
    const highSecurity = computeScore([
      makeScanResult('security', 100),
      makeScanResult('accessibility', 0),
    ]);
    const highAccessibility = computeScore([
      makeScanResult('security', 0),
      makeScanResult('accessibility', 100),
    ]);

    // Security has weight 0.25 vs accessibility 0.1 (with unscored as 100)
    // Higher security should yield higher overall
    expect(highSecurity.overall).toBeGreaterThan(highAccessibility.overall);
  });

  it('should return grade A+ for score >= 97', () => {
    expect(scoreToGrade(97)).toBe('A+');
    expect(scoreToGrade(100)).toBe('A+');
  });

  it('should return grade F for score < 60', () => {
    expect(scoreToGrade(50)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
  });

  it('should return correct subScores for each category', () => {
    const results: ScanResult[] = [makeScanResult('quality', 75, 5)];
    const report = computeScore(results);
    expect(report.subScores.quality.score).toBe(75);
    expect(report.subScores.quality.issueCount).toBe(5);
  });

  it('should handle empty results', () => {
    const report = computeScore([]);
    expect(report.overall).toBe(0);
  });
});

describe('scoreToGrade', () => {
  const cases: Array<[number, string]> = [
    [100, 'A+'], [97, 'A+'], [95, 'A'], [91, 'A-'],
    [88, 'B+'], [84, 'B'], [81, 'B-'],
    [78, 'C+'], [74, 'C'], [71, 'C-'],
    [65, 'D'], [30, 'F'],
  ];

  for (const [score, expected] of cases) {
    it(`should return ${expected} for score ${score}`, () => {
      expect(scoreToGrade(score)).toBe(expected);
    });
  }
});
