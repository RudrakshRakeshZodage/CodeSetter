import { ScanResult, Issue, CodeSetterConfig } from '../../types/index.js';
import { walkFiles } from '../../core/file-walker.js';
import { readFileSafe, relativePath } from '../../utils/file-utils.js';
import { HEAVY_DEPS, NESTED_LOOP_PATTERN } from '../../utils/regex-patterns.js';
import path from 'path';
import { readJsonFile } from '../../utils/file-utils.js';

export class PerformanceScanner {
  async scan(dir: string, config: CodeSetterConfig): Promise<ScanResult> {
    const start = Date.now();
    const files = await walkFiles(dir, {
      extensions: ['ts', 'tsx', 'js', 'jsx'],
      ignore: config.ignore,
      includeTests: false,
    });

    const issues: Issue[] = [];

    // ─── Check dependencies for heavy packages ─────────────────────────────
    const pkgIssues = await this.checkDependencies(dir);
    issues.push(...pkgIssues);

    for (const file of files) {
      const content = await readFileSafe(file);
      if (!content) continue;

      const relFile = relativePath(file, dir);
      const lines = content.split('\n');

      // ─── Nested loops (O(n²)) ───────────────────────────────────────────
      if (NESTED_LOOP_PATTERN.test(content)) {
        const lineNum = content.split('\n').findIndex((l) => /\bfor\s*\(/.test(l));
        issues.push({
          id: `perf-nested-loop-${relFile}`,
          category: 'performance',
          severity: 'medium',
          title: 'Nested Loop (O(n²) or worse)',
          description: 'Nested loops can cause performance degradation with large datasets.',
          location: { file: relFile, line: lineNum + 1 },
          rule: 'no-nested-loops',
          fix: {
            description: 'Use Map/Set for O(1) lookups, or restructure the algorithm',
            automated: false,
          },
          effort: 'hard',
          impact: 'high',
        });
      }

      // ─── React: missing memoization ────────────────────────────────────
      const isReactFile = content.includes('React') || content.includes('jsx') || file.endsWith('.tsx') || file.endsWith('.jsx');

      if (isReactFile) {
        // Large components without React.memo
        const hasDefaultExport = /export\s+default\s+function/.test(content);
        const hasMemo = /React\.memo|memo\(/.test(content);
        const isComponent = /return\s*\(?\s*</.test(content);

        if (hasDefaultExport && isComponent && !hasMemo && lines.length > 50) {
          issues.push({
            id: `perf-missing-memo-${relFile}`,
            category: 'performance',
            severity: 'low',
            title: 'Missing React.memo',
            description: 'Large component without React.memo may cause unnecessary re-renders.',
            location: { file: relFile },
            rule: 'react-memo',
            fix: {
              description: 'Wrap the component export with React.memo()',
              before: 'export default function MyComponent(props) { ... }',
              after: 'export default React.memo(function MyComponent(props) { ... })',
              automated: true,
            },
            effort: 'trivial',
            impact: 'medium',
          });
        }

        // useEffect with missing dependencies (basic detection)
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/useEffect\s*\(/.test(line)) {
            // Check if the next few lines have empty dependency array or no array
            const block = lines.slice(i, i + 10).join('\n');
            if (/useEffect\s*\([^)]+\)(?!\s*,)/.test(block) || /,\s*\[\s*\]\s*\)/.test(block)) {
              // Empty deps array - flag only if there are variables used inside
              if (/,\s*\[\s*\]\s*\)/.test(block) && /\b[a-z]\w+\s*\(/.test(block)) {
                // Potential stale closure
                issues.push({
                  id: `perf-stale-closure-${relFile}-${i}`,
                  category: 'performance',
                  severity: 'medium',
                  title: 'Possible Stale Closure in useEffect',
                  description: 'useEffect with empty deps may capture stale values.',
                  location: { file: relFile, line: i + 1 },
                  rule: 'react-hooks/exhaustive-deps',
                  fix: {
                    description: 'Add proper dependencies to the useEffect dependency array',
                    automated: false,
                  },
                  effort: 'easy',
                  impact: 'medium',
                });
              }
            }
          }
        }

        // Missing useMemo for expensive computations
        const hasExpensiveOps = /\.filter\(.*\)\.map\(|\.reduce\(/.test(content);
        const hasUseMemo = /useMemo\s*\(/.test(content);
        if (hasExpensiveOps && !hasUseMemo && lines.length > 30) {
          issues.push({
            id: `perf-missing-usememo-${relFile}`,
            category: 'performance',
            severity: 'low',
            title: 'Consider useMemo for Expensive Computations',
            description: 'Chained array operations without useMemo recalculate on every render.',
            location: { file: relFile },
            rule: 'react-usememo',
            fix: {
              description: 'Wrap expensive derived computations in useMemo()',
              before: 'const result = items.filter(...).map(...)',
              after: 'const result = useMemo(() => items.filter(...).map(...), [items])',
              automated: false,
            },
            effort: 'easy',
            impact: 'medium',
          });
        }

        // Missing lazy loading for route components
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (
            /import\s+\w+\s+from\s+['"].*(?:Page|Route|View|Screen)/.test(line) &&
            !/lazy|dynamic|Suspense/.test(line)
          ) {
            issues.push({
              id: `perf-missing-lazy-${relFile}-${i}`,
              category: 'performance',
              severity: 'low',
              title: 'Missing Route Lazy Loading',
              description: `Page/Route component imported synchronously. Use React.lazy() for code splitting.`,
              location: { file: relFile, line: i + 1 },
              rule: 'react-lazy-routes',
              fix: {
                description: 'Use React.lazy() or Next.js dynamic() for page components',
                before: line.trim(),
                after: `const ${line.match(/import\s+(\w+)/)?.[1] ?? 'Component'} = React.lazy(() => import('...'))`,
                automated: false,
              },
              effort: 'easy',
              impact: 'medium',
            });
            break; // One issue per file
          }
        }

        // Duplicate API calls (same fetch/axios URL called in multiple places)
        const apiCalls = content.match(/(?:fetch|axios\.get|axios\.post)\s*\(\s*['"`]([^'"` ]+)['"`]/g) ?? [];
        const urlSet = new Set<string>();
        const duplicates = new Set<string>();
        for (const call of apiCalls) {
          const url = call.replace(/(?:fetch|axios\.get|axios\.post)\s*\(\s*['"`]/, '').replace(/['"`].*/, '');
          if (urlSet.has(url)) duplicates.add(url);
          urlSet.add(url);
        }
        for (const url of duplicates) {
          issues.push({
            id: `perf-duplicate-api-${relFile}-${url}`,
            category: 'performance',
            severity: 'medium',
            title: 'Duplicate API Call',
            description: `URL "${url}" is fetched multiple times. Consider caching with SWR/React Query.`,
            location: { file: relFile },
            rule: 'no-duplicate-api-calls',
            fix: {
              description: 'Use SWR, React Query, or a shared cache to deduplicate requests',
              automated: false,
            },
            effort: 'medium',
            impact: 'medium',
          });
        }
      }

      // ─── Synchronous file system operations ──────────────────────────────
      for (let i = 0; i < lines.length; i++) {
        if (/readFileSync|writeFileSync|existsSync|mkdirSync/.test(lines[i])) {
          issues.push({
            id: `perf-sync-fs-${relFile}-${i}`,
            category: 'performance',
            severity: 'medium',
            title: 'Synchronous File System Operation',
            description: 'Synchronous fs operations block the event loop.',
            location: { file: relFile, line: i + 1 },
            rule: 'no-sync-fs',
            fix: {
              description: 'Use async alternatives: fs.readFile(), fs.writeFile(), etc.',
              before: lines[i].trim(),
              after: lines[i].trim().replace(/Sync\b/, '').trim() + ' // use await',
              automated: false,
            },
            effort: 'easy',
            impact: 'medium',
          });
        }
      }
    }

    const score = computePerformanceScore(issues);

    return {
      category: 'performance',
      issues,
      score,
      filesScanned: files.length,
      duration: Date.now() - start,
    };
  }

  private async checkDependencies(dir: string): Promise<Issue[]> {
    const pkg = await readJsonFile<{ dependencies?: Record<string, string> }>(
      path.join(dir, 'package.json')
    );
    if (!pkg?.dependencies) return [];

    const issues: Issue[] = [];

    for (const [depName, info] of Object.entries(HEAVY_DEPS)) {
      if (Object.keys(pkg.dependencies).some((d) => d === depName || d.startsWith(depName))) {
        issues.push({
          id: `perf-heavy-dep-${depName}`,
          category: 'performance',
          severity: 'medium',
          title: `Heavy Dependency: ${depName}`,
          description: `"${depName}" adds ~${info.weight} to your bundle.${info.alternative ? ` Consider: ${info.alternative}` : ''}`,
          location: { file: 'package.json' },
          rule: 'heavy-dependencies',
          fix: {
            description: info.alternative ? `Replace with ${info.alternative}` : 'Consider tree-shaking',
            automated: false,
          },
          effort: 'medium',
          impact: 'medium',
        });
      }
    }

    return issues;
  }
}

function computePerformanceScore(issues: Issue[]): number {
  const penalties = { critical: 15, high: 8, medium: 4, low: 1, info: 0 };
  const total = issues.reduce((sum, i) => sum + (penalties[i.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - total));
}
