import path from 'path';
import { ScanResult, Issue, CodeSetterConfig } from '../../types/index.js';
import { walkFiles } from '../../core/file-walker.js';
import { readFileSafe, relativePath, fileExists } from '../../utils/file-utils.js';
import { logger } from '../../utils/logger.js';

const GOOD_FOLDER_PATTERNS = [
  'src',
  'lib',
  'components',
  'pages',
  'services',
  'utils',
  'helpers',
  'hooks',
  'store',
  'models',
  'types',
  'tests',
  '__tests__',
  'config',
  'middleware',
  'controllers',
  'repositories',
  'routes',
];

const DESIGN_PATTERNS: Record<string, RegExp> = {
  Singleton: /private\s+static\s+instance|getInstance\s*\(\)/,
  Factory: /createInstance|Factory\s*\{|factory\s*\(/i,
  Repository: /Repository\s*\{|interface\s+\w+Repository/,
  Observer: /subscribe|unsubscribe|EventEmitter|Subject/,
  Decorator: /@\w+\s*\n.*class\s+/,
  Strategy: /interface\s+\w+Strategy|Strategy\s*\{/,
};

export class ArchitectureScanner {
  async scan(dir: string, config: CodeSetterConfig): Promise<ScanResult> {
    const start = Date.now();

    const files = await walkFiles(dir, {
      ignore: config.ignore,
    });

    const issues: Issue[] = [];
    const detectedPatterns: string[] = [];

    // ─── Folder structure analysis ────────────────────────────────────────
    const folderIssues = await this.analyzeFolderStructure(dir, files);
    issues.push(...folderIssues);

    // ─── Circular dependency detection ───────────────────────────────────
    const circularIssues = await this.detectCircularDependencies(files, dir);
    issues.push(...circularIssues);

    // ─── Layer separation analysis ────────────────────────────────────────
    const layerIssues = await this.analyzeLayerSeparation(files, dir);
    issues.push(...layerIssues);

    // ─── Design pattern detection ─────────────────────────────────────────
    for (const file of files) {
      const content = await readFileSafe(file);
      if (!content) continue;

      for (const [pattern, regex] of Object.entries(DESIGN_PATTERNS)) {
        if (regex.test(content) && !detectedPatterns.includes(pattern)) {
          detectedPatterns.push(pattern);
        }
      }
    }

    // ─── Flat structure detection ─────────────────────────────────────────
    const rootSourceFiles = files.filter(
      (f) => path.dirname(f) === dir || path.dirname(f) === path.join(dir, 'src')
    );

    if (rootSourceFiles.length > 10) {
      issues.push({
        id: 'arch-flat-structure',
        category: 'architecture',
        severity: 'medium',
        title: 'Flat Project Structure',
        description: `${rootSourceFiles.length} files in root/src with no sub-directory organization.`,
        location: { file: '.' },
        rule: 'folder-structure',
        fix: {
          description: 'Organize files into feature or layer directories (components/, services/, etc.)',
          automated: false,
        },
        effort: 'medium',
        impact: 'medium',
      });
    }

    // ─── Large monolith detection ─────────────────────────────────────────
    if (files.length > 200) {
      issues.push({
        id: 'arch-large-project',
        category: 'architecture',
        severity: 'low',
        title: 'Large Monolith Project',
        description: `${files.length} source files. Consider splitting into packages or modules.`,
        location: { file: '.' },
        rule: 'module-size',
        fix: {
          description: 'Consider a monorepo structure (Turborepo, Nx) or micro-frontends',
          automated: false,
        },
        effort: 'hard',
        impact: 'medium',
      });
    }

    // ─── Missing README ───────────────────────────────────────────────────
    if (!(await fileExists(path.join(dir, 'README.md')))) {
      issues.push({
        id: 'arch-missing-readme',
        category: 'architecture',
        severity: 'low',
        title: 'Missing README.md',
        description: 'No README.md found. Documentation is essential for maintainability.',
        location: { file: 'README.md' },
        rule: 'require-readme',
        fix: {
          description: 'Create a README.md with setup instructions and architecture overview',
          automated: false,
        },
        effort: 'easy',
        impact: 'low',
      });
    }

    // ─── Missing .env.example ─────────────────────────────────────────────
    const hasEnvExample =
      (await fileExists(path.join(dir, '.env.example'))) ||
      (await fileExists(path.join(dir, '.env.sample')));
    const hasEnv = await fileExists(path.join(dir, '.env'));

    if (hasEnv && !hasEnvExample) {
      issues.push({
        id: 'arch-missing-env-example',
        category: 'architecture',
        severity: 'medium',
        title: 'Missing .env.example',
        description: '.env found but no .env.example. New developers cannot configure the project.',
        location: { file: '.env' },
        rule: 'require-env-example',
        fix: {
          description: 'Create .env.example with all required variable keys (no values)',
          automated: false,
        },
        effort: 'trivial',
        impact: 'medium',
      });
    }

    const score = computeArchScore(issues, files.length);

    return {
      category: 'architecture',
      issues,
      score,
      filesScanned: files.length,
      duration: Date.now() - start,
      metadata: {
        totalFiles: files.length,
        detectedDesignPatterns: detectedPatterns,
        folderStructureScore: Math.max(0, 100 - folderIssues.length * 10),
      },
    };
  }

  private async analyzeFolderStructure(dir: string, files: string[]): Promise<Issue[]> {
    const issues: Issue[] = [];
    const srcDir = path.join(dir, 'src');
    const hasSrc = await fileExists(srcDir);

    if (!hasSrc && files.length > 5) {
      issues.push({
        id: 'arch-no-src-dir',
        category: 'architecture',
        severity: 'low',
        title: 'No src/ Directory',
        description: 'Source code not organized under a src/ directory.',
        location: { file: '.' },
        rule: 'src-directory',
        fix: {
          description: 'Organize source files under a src/ directory',
          automated: false,
        },
        effort: 'medium',
        impact: 'low',
      });
    }

    return issues;
  }

  private async detectCircularDependencies(files: string[], dir: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const importGraph = new Map<string, Set<string>>();

    // Build import graph
    for (const file of files) {
      const content = await readFileSafe(file);
      if (!content) continue;

      const imports = new Set<string>();
      const importMatches = content.matchAll(/from\s+['"](\.[^'"]+)['"]/g);

      for (const match of importMatches) {
        const importPath = match[1];
        const resolved = path.resolve(path.dirname(file), importPath);
        const relResolved = relativePath(resolved, dir);
        imports.add(relResolved);
      }

      importGraph.set(relativePath(file, dir), imports);
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const hasCycle = (node: string, path: string[]): string[] | null => {
      if (inStack.has(node)) return [...path, node];
      if (visited.has(node)) return null;

      visited.add(node);
      inStack.add(node);

      const deps = importGraph.get(node) ?? new Set();
      for (const dep of deps) {
        const cycle = hasCycle(dep, [...path, node]);
        if (cycle) return cycle;
      }

      inStack.delete(node);
      return null;
    };

    for (const node of importGraph.keys()) {
      if (!visited.has(node)) {
        const cycle = hasCycle(node, []);
        if (cycle && cycle.length > 0) {
          issues.push({
            id: `arch-circular-dep-${node}`,
            category: 'architecture',
            severity: 'high',
            title: 'Circular Dependency',
            description: `Circular import detected: ${cycle.slice(-3).join(' → ')}`,
            location: { file: node },
            rule: 'no-circular-dependencies',
            fix: {
              description: 'Extract shared logic into a third module to break the cycle',
              automated: false,
            },
            effort: 'hard',
            impact: 'high',
          });
        }
      }
    }

    return issues;
  }

  private async analyzeLayerSeparation(files: string[], dir: string): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Detect if controllers/routes import repositories directly (skipping service layer)
    for (const file of files) {
      const relFile = relativePath(file, dir);
      const isController =
        /controller|route/i.test(relFile) && !relFile.includes('__tests__');

      if (isController) {
        const content = await readFileSafe(file);
        if (!content) continue;

        const importsRepo = /from\s+['"].*repository/i.test(content);
        const importsDb = /from\s+['"].*(?:db|database|prisma|mongoose|typeorm)/i.test(content);

        if ((importsRepo || importsDb) && !/service/i.test(content)) {
          issues.push({
            id: `arch-layer-violation-${relFile}`,
            category: 'architecture',
            severity: 'medium',
            title: 'Layer Separation Violation',
            description: `Controller "${relFile}" imports data layer directly, skipping the service layer.`,
            location: { file: relFile },
            rule: 'layer-separation',
            fix: {
              description: 'Controllers should only import services; data access goes in repositories',
              automated: false,
            },
            effort: 'hard',
            impact: 'high',
          });
        }
      }
    }

    return issues;
  }
}

function computeArchScore(issues: Issue[], fileCount: number): number {
  if (fileCount === 0) return 100;
  const penalties = { critical: 20, high: 10, medium: 5, low: 2, info: 0 };
  const total = issues.reduce((sum, i) => sum + (penalties[i.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - total));
}
