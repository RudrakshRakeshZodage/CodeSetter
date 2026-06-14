import path from 'path';
import { ScanResult, Issue, CodeSetterConfig } from '../../types/index.js';
import { walkFiles } from '../../core/file-walker.js';
import { readFileSafe, countLines, relativePath } from '../../utils/file-utils.js';
import { getTsMorphProject, addSourceFile, getCyclomaticComplexity, getFunctionLineCount, getNestingDepth } from '../../utils/ast-utils.js';
import { CONSOLE_LOG_PATTERN, TODO_PATTERN, DEBUGGER_PATTERN } from '../../utils/regex-patterns.js';

const MAX_FILE_LINES = 500;
const MAX_FUNCTION_LINES = 50;
const MAX_COMPLEXITY = 10;
const MAX_NESTING_DEPTH = 4;

export class QualityScanner {
  async scan(dir: string, config: CodeSetterConfig): Promise<ScanResult> {
    const start = Date.now();
    const files = await walkFiles(dir, {
      extensions: ['ts', 'tsx', 'js', 'jsx'],
      ignore: config.ignore,
      includeTests: false,
    });

    const issues: Issue[] = [];
    const project = getTsMorphProject();

    for (const file of files) {
      const content = await readFileSafe(file);
      if (!content) continue;

      const relFile = relativePath(file, dir);
      const lines = content.split('\n');
      const lineCount = lines.length;

      // ─── Large File ────────────────────────────────────────────────────────
      if (lineCount > MAX_FILE_LINES) {
        issues.push({
          id: `quality-large-file-${relFile}`,
          category: 'quality',
          severity: lineCount > 1000 ? 'high' : 'medium',
          title: 'Large File',
          description: `File has ${lineCount} lines. Files over ${MAX_FILE_LINES} lines are hard to maintain.`,
          location: { file: relFile },
          rule: 'max-file-size',
          fix: {
            description: 'Split into smaller, focused modules',
            automated: false,
          },
          effort: 'medium',
          impact: 'medium',
        });
      }

      // ─── Console.log statements ───────────────────────────────────────────
      lines.forEach((line, idx) => {
        if (CONSOLE_LOG_PATTERN.test(line)) {
          issues.push({
            id: `quality-console-log-${relFile}-${idx}`,
            category: 'quality',
            severity: 'low',
            title: 'Console Statement',
            description: 'Remove debug console statements before production.',
            location: { file: relFile, line: idx + 1 },
            rule: 'no-console',
            fix: {
              description: 'Remove or replace with a proper logger',
              before: line.trim(),
              after: '// use a logger instead',
              automated: true,
            },
            effort: 'trivial',
            impact: 'low',
          });
        }

        // ─── Debugger statement ──────────────────────────────────────────────
        if (DEBUGGER_PATTERN.test(line)) {
          issues.push({
            id: `quality-debugger-${relFile}-${idx}`,
            category: 'quality',
            severity: 'medium',
            title: 'Debugger Statement',
            description: 'Debugger statement left in production code.',
            location: { file: relFile, line: idx + 1 },
            rule: 'no-debugger',
            fix: {
              description: 'Remove the debugger statement',
              before: line.trim(),
              after: '',
              automated: true,
            },
            effort: 'trivial',
            impact: 'low',
          });
        }

        // ─── TODO / FIXME comments ───────────────────────────────────────────
        if (TODO_PATTERN.test(line)) {
          issues.push({
            id: `quality-todo-${relFile}-${idx}`,
            category: 'quality',
            severity: 'info',
            title: 'TODO / FIXME Comment',
            description: 'Unresolved TODO or FIXME comment.',
            location: { file: relFile, line: idx + 1 },
            rule: 'no-todo',
            effort: 'easy',
            impact: 'low',
          });
        }
      });

      // ─── Nesting depth ────────────────────────────────────────────────────
      const depth = getNestingDepth(content);
      if (depth > MAX_NESTING_DEPTH) {
        issues.push({
          id: `quality-deep-nesting-${relFile}`,
          category: 'quality',
          severity: depth > 7 ? 'high' : 'medium',
          title: 'Deep Nesting',
          description: `Maximum nesting depth of ${depth} detected. Aim for ≤ ${MAX_NESTING_DEPTH}.`,
          location: { file: relFile },
          rule: 'max-depth',
          fix: {
            description: 'Extract deeply nested blocks into separate functions',
            automated: false,
          },
          effort: 'medium',
          impact: 'medium',
        });
      }

      // ─── AST-based analysis ───────────────────────────────────────────────
      const isTypeScript = file.endsWith('.ts') || file.endsWith('.tsx');
      if (isTypeScript) {
        const sourceFile = addSourceFile(project, file);
        if (sourceFile) {
          // Check all functions (declarations + arrow + expressions)
          const allFunctions = [
            ...sourceFile.getFunctions(),
            ...sourceFile.getDescendantsOfKind(
              (await import('ts-morph')).SyntaxKind.ArrowFunction
            ),
          ];

          for (const fn of allFunctions) {
            const fnName =
              ('getName' in fn && typeof fn.getName === 'function' ? fn.getName() : null) ??
              'anonymous';

            // Long function
            const fnLines = getFunctionLineCount(fn as Parameters<typeof getFunctionLineCount>[0]);
            if (fnLines > MAX_FUNCTION_LINES) {
              const lineNum = fn.getStartLineNumber();
              issues.push({
                id: `quality-long-method-${relFile}-${lineNum}`,
                category: 'quality',
                severity: fnLines > 100 ? 'high' : 'medium',
                title: 'Long Function',
                description: `Function "${fnName}" has ${fnLines} lines. Max recommended: ${MAX_FUNCTION_LINES}.`,
                location: { file: relFile, line: lineNum },
                rule: 'max-lines-per-function',
                fix: {
                  description: 'Break into smaller, single-responsibility functions',
                  automated: false,
                },
                effort: 'medium',
                impact: 'medium',
              });
            }

            // High complexity
            const complexity = getCyclomaticComplexity(fn as Parameters<typeof getCyclomaticComplexity>[0]);
            if (complexity > MAX_COMPLEXITY) {
              const lineNum = fn.getStartLineNumber();
              issues.push({
                id: `quality-complexity-${relFile}-${lineNum}`,
                category: 'quality',
                severity: complexity > 20 ? 'high' : 'medium',
                title: 'High Cyclomatic Complexity',
                description: `Function "${fnName}" has complexity ${complexity}. Max recommended: ${MAX_COMPLEXITY}.`,
                location: { file: relFile, line: lineNum },
                rule: 'complexity',
                fix: {
                  description: 'Extract branches into separate functions or use strategy pattern',
                  automated: false,
                },
                effort: 'hard',
                impact: 'high',
                references: [
                  'https://en.wikipedia.org/wiki/Cyclomatic_complexity',
                ],
              });
            }
          }

          // Unused variables (via ts-morph unreferenced locals)
          const variables = sourceFile.getVariableDeclarations();
          for (const v of variables) {
            const refs = v.findReferencesAsNodes();
            // Only the declaration itself = unreferenced
            if (refs.length <= 1) {
              const name = v.getName();
              // Skip _ prefixed (intentional)
              if (name.startsWith('_')) continue;
              issues.push({
                id: `quality-unused-var-${relFile}-${v.getStartLineNumber()}`,
                category: 'quality',
                severity: 'low',
                title: 'Unused Variable',
                description: `Variable "${name}" is declared but never used.`,
                location: { file: relFile, line: v.getStartLineNumber() },
                rule: 'no-unused-vars',
                fix: {
                  description: `Remove or prefix with "_" to suppress: _${name}`,
                  automated: true,
                },
                effort: 'trivial',
                impact: 'low',
              });
            }
          }

          // Any type usage
          const anyUsages = sourceFile
            .getDescendantsOfKind((await import('ts-morph')).SyntaxKind.AnyKeyword);
          if (anyUsages.length > 0) {
            issues.push({
              id: `quality-any-type-${relFile}`,
              category: 'quality',
              severity: 'low',
              title: 'Explicit `any` Type',
              description: `${anyUsages.length} use(s) of "any" type detected. Use proper types for type safety.`,
              location: { file: relFile, line: anyUsages[0].getStartLineNumber() },
              rule: 'no-explicit-any',
              fix: {
                description: 'Replace `any` with the correct type or `unknown`',
                automated: false,
              },
              effort: 'easy',
              impact: 'medium',
            });
          }
        }
      }

      // ─── Duplicate code (simple: duplicate function names across files) ───
      // (Full duplicate detection requires cross-file AST comparison; we detect obvious patterns)
      const fnNames = content.match(/(?:function\s+|const\s+)(\w+)\s*(?:=\s*(?:async\s+)?\(|\()/g);
      if (fnNames) {
        const seen = new Set<string>();
        const dupes = new Set<string>();
        for (const fn of fnNames) {
          const name = fn.replace(/^(?:function\s+|const\s+)/, '').split(/\s|=/)[0];
          if (seen.has(name)) dupes.add(name);
          seen.add(name);
        }
        for (const dupe of dupes) {
          issues.push({
            id: `quality-duplicate-fn-${relFile}-${dupe}`,
            category: 'quality',
            severity: 'medium',
            title: 'Duplicate Function Name',
            description: `Function "${dupe}" is defined more than once in this file.`,
            location: { file: relFile },
            rule: 'no-duplicate-functions',
            fix: {
              description: 'Remove duplicate definitions or rename to clarify intent',
              automated: false,
            },
            effort: 'easy',
            impact: 'medium',
          });
        }
      }
    }

    const score = computeQualityScore(issues, files.length);

    return {
      category: 'quality',
      issues,
      score,
      filesScanned: files.length,
      duration: Date.now() - start,
      metadata: {
        filesAnalyzed: files.length,
        issuesByType: groupByRule(issues),
      },
    };
  }
}

function computeQualityScore(issues: Issue[], fileCount: number): number {
  if (fileCount === 0) return 100;
  const penalties = issues.reduce((sum, i) => {
    const p = { critical: 15, high: 8, medium: 3, low: 1, info: 0.5 };
    return sum + (p[i.severity] ?? 0);
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalties / Math.max(fileCount, 1) * 2));
}

function groupByRule(issues: Issue[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const i of issues) {
    if (i.rule) map[i.rule] = (map[i.rule] ?? 0) + 1;
  }
  return map;
}
