import { Project, SourceFile, FunctionDeclaration, ArrowFunction, FunctionExpression } from 'ts-morph';

let _project: Project | null = null;

/**
 * Get or create the ts-morph Project instance (singleton per run).
 */
export function getTsMorphProject(tsConfigPath?: string): Project {
  if (!_project) {
    _project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true,
    });
  }
  return _project;
}

/**
 * Reset the ts-morph project (useful between scans).
 */
export function resetProject(): void {
  _project = null;
}

/**
 * Add a source file to the project from disk.
 */
export function addSourceFile(project: Project, filePath: string): SourceFile | null {
  try {
    // If already added, return existing
    const existing = project.getSourceFile(filePath);
    if (existing) return existing;
    return project.addSourceFileAtPath(filePath);
  } catch {
    return null;
  }
}

/**
 * Get cyclomatic complexity of a function node.
 * Counts: if, else if, for, while, do-while, switch case, catch, ternary, &&, ||, ??
 */
export function getCyclomaticComplexity(
  node: FunctionDeclaration | ArrowFunction | FunctionExpression
): number {
  let complexity = 1; // base complexity

  const text = node.getText();

  // Count branching constructs via regex on text (fast approximation)
  const branches = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bdo\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*[^:]/g,  // ternary
    /&&/g,
    /\|\|/g,
    /\?\?/g,
  ];

  for (const pattern of branches) {
    const matches = text.match(pattern);
    if (matches) complexity += matches.length;
  }

  return complexity;
}

/**
 * Get nesting depth of a code block (counts opening braces).
 */
export function getNestingDepth(content: string): number {
  let maxDepth = 0;
  let current = 0;
  for (const char of content) {
    if (char === '{') {
      current++;
      maxDepth = Math.max(maxDepth, current);
    } else if (char === '}') {
      current = Math.max(0, current - 1);
    }
  }
  return maxDepth;
}

/**
 * Count lines in a function node.
 */
export function getFunctionLineCount(
  node: FunctionDeclaration | ArrowFunction | FunctionExpression
): number {
  const start = node.getStartLineNumber();
  const end = node.getEndLineNumber();
  return end - start + 1;
}

/**
 * Extract all import declarations from a source file.
 */
export function getImports(sourceFile: SourceFile): Array<{ module: string; names: string[] }> {
  return sourceFile.getImportDeclarations().map((imp) => ({
    module: imp.getModuleSpecifierValue(),
    names: imp.getNamedImports().map((n) => n.getName()),
  }));
}
