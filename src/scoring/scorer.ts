import { ScanResult, ScoreReport, SubScore, ScoreWeights, Category, Grade } from '../types/index.js';

const DEFAULT_WEIGHTS: ScoreWeights = {
  quality: 0.2,
  security: 0.25,
  performance: 0.2,
  accessibility: 0.1,
  testing: 0.15,
  architecture: 0.1,
};

/**
 * Compute the overall score and sub-scores from scanner results.
 */
export function computeScore(results: ScanResult[], weights: Partial<ScoreWeights> = {}): ScoreReport {
  const effectiveWeights: ScoreWeights = { ...DEFAULT_WEIGHTS, ...weights };

  const subScores: Partial<Record<Category, SubScore>> = {};

  for (const result of results) {
    const cat = result.category;
    subScores[cat] = {
      category: cat,
      score: Math.round(result.score),
      grade: scoreToGrade(result.score),
      issueCount: result.issues.length,
      criticalCount: result.issues.filter((i) => i.severity === 'critical').length,
      highCount: result.issues.filter((i) => i.severity === 'high').length,
    };
  }

  // Compute weighted overall score
  let weightedSum = 0;
  let weightTotal = 0;

  for (const [cat, weight] of Object.entries(effectiveWeights) as [Category, number][]) {
    const sub = subScores[cat];
    if (sub !== undefined) {
      weightedSum += sub.score * weight;
      weightTotal += weight;
    }
  }

  const overall = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  // Fill missing categories with 100 (not scanned = assume perfect)
  const allCategories: Category[] = [
    'quality',
    'security',
    'performance',
    'accessibility',
    'testing',
    'architecture',
  ];

  const fullSubScores = {} as Record<Category, SubScore>;
  for (const cat of allCategories) {
    fullSubScores[cat] = subScores[cat] ?? {
      category: cat,
      score: 100,
      grade: 'A+',
      issueCount: 0,
      criticalCount: 0,
      highCount: 0,
    };
  }

  return {
    overall,
    grade: scoreToGrade(overall),
    subScores: fullSubScores,
    weights: effectiveWeights,
  };
}

export function scoreToGrade(score: number): Grade {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

export function gradeColor(grade: Grade): string {
  if (grade.startsWith('A')) return '#10b981';
  if (grade.startsWith('B')) return '#3b82f6';
  if (grade.startsWith('C')) return '#f59e0b';
  if (grade === 'D') return '#f97316';
  return '#ef4444';
}

export function scoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}
