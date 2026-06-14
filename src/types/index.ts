// ─────────────────────────────────────────────────────────────────────────────
// CodeSetter — Core Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type Category =
  | 'quality'
  | 'security'
  | 'performance'
  | 'accessibility'
  | 'testing'
  | 'architecture'
  | 'dependencies';

export type ReportFormat = 'html' | 'json' | 'markdown' | 'pdf';
export type AIProvider = 'openai' | 'gemini' | 'ollama';
export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export type DetectedStack =
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'angular'
  | 'nestjs'
  | 'express'
  | 'node'
  | 'typescript'
  | 'javascript'
  | 'unknown';

// ─── Issue ───────────────────────────────────────────────────────────────────

export interface IssueLocation {
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface FixSuggestion {
  description: string;
  before?: string;
  after?: string;
  automated: boolean;
}

export interface Issue {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  location: IssueLocation;
  rule?: string;
  fix?: FixSuggestion;
  tags?: string[];
  effort?: 'trivial' | 'easy' | 'medium' | 'hard';
  impact?: 'low' | 'medium' | 'high';
  references?: string[];
}

// ─── Scanner Results ──────────────────────────────────────────────────────────

export interface ScanResult {
  category: Category;
  issues: Issue[];
  score: number;
  filesScanned: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface SubScore {
  category: Category;
  score: number;
  grade: Grade;
  issueCount: number;
  criticalCount: number;
  highCount: number;
}

export interface ScoreWeights {
  quality: number;
  security: number;
  performance: number;
  accessibility: number;
  testing: number;
  architecture: number;
}

export interface ScoreReport {
  overall: number;
  grade: Grade;
  subScores: Record<Category, SubScore>;
  weights: ScoreWeights;
  trend?: 'improving' | 'declining' | 'stable';
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIInsight {
  category: Category;
  summary: string;
  suggestions: string[];
  codeExamples?: Array<{ before: string; after: string; explanation: string }>;
}

export interface AIAnalysis {
  insights: AIInsight[];
  overallSummary: string;
  priorityActions: string[];
  estimatedFixTime: string;
}

// ─── Stack ───────────────────────────────────────────────────────────────────

export interface StackInfo {
  primary: DetectedStack;
  secondary: DetectedStack[];
  hasTypeScript: boolean;
  hasTests: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
  nodeVersion?: string;
  frameworks: string[];
  testFrameworks: string[];
  buildTools: string[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface ScannerConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

export interface ReportConfig {
  formats: ReportFormat[];
  output: string;
  open?: boolean;
}

export interface ScoringConfig {
  weights: ScoreWeights;
}

export interface CodeSetterConfig {
  path: string;
  ignore: string[];
  severity: Severity;
  ai?: AIConfig;
  scanners: Partial<Record<Category, ScannerConfig>>;
  scoring: ScoringConfig;
  report: ReportConfig;
  plugins?: string[];
}

// ─── Audit Report ─────────────────────────────────────────────────────────────

export interface AuditReport {
  id: string;
  timestamp: string;
  version: string;
  path: string;
  stack: StackInfo;
  config: CodeSetterConfig;
  results: ScanResult[];
  score: ScoreReport;
  ai?: AIAnalysis;
  reportPaths?: Partial<Record<ReportFormat, string>>;
  duration: number;
  summary: AuditSummary;
}

export interface AuditSummary {
  totalFiles: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  infoIssues: number;
  categories: Record<Category, number>;
}

// ─── Plugin System ────────────────────────────────────────────────────────────

export interface CodeSetterPlugin {
  name: string;
  version?: string;
  description?: string;
  scan(
    files: string[],
    config: CodeSetterConfig
  ): Promise<{ issues: Issue[]; score: number; metadata?: Record<string, unknown> }>;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

export interface CLIOptions {
  path?: string;
  format?: string;
  output?: string;
  ai?: AIProvider;
  key?: string;
  model?: string;
  ignore?: string;
  json?: boolean;
  severity?: Severity;
  noAi?: boolean;
}
