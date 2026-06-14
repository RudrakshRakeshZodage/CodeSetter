import { ScanResult, CodeSetterConfig } from '../types/index.js';
import { walkFiles } from '../core/file-walker.js';
import { readFileSafe, relativePath } from '../utils/file-utils.js';

/**
 * Node.js / Express-specific analyzer.
 */
export class NodeAnalyzer {
  async analyze(dir: string, config: CodeSetterConfig): Promise<Partial<ScanResult>> {
    const files = await walkFiles(dir, {
      extensions: ['ts', 'js'],
      ignore: config.ignore,
      includeTests: false,
    });

    const issues: ScanResult['issues'] = [];

    for (const file of files) {
      const content = await readFileSafe(file);
      if (!content) continue;

      const relFile = relativePath(file, dir);
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Unhandled promise rejections
        if (/\.then\s*\(/.test(line) && !lines.slice(i, i + 5).join('').includes('.catch(')) {
          issues.push({
            id: `node-unhandled-promise-${relFile}-${i}`,
            category: 'quality',
            severity: 'medium',
            title: 'Unhandled Promise Rejection',
            description: 'Promise chain without .catch() will silently swallow errors.',
            location: { file: relFile, line: i + 1 },
            rule: 'no-unhandled-promise',
            fix: {
              description: 'Add .catch(err => ...) or use try/catch with async/await',
              before: line.trim(),
              after: line.trim() + '\n.catch(err => console.error(err))',
              automated: false,
            },
            effort: 'easy',
            impact: 'high',
          });
        }

        // Missing error middleware (Express)
        if (/app\.use\s*\(/.test(line) && !content.includes('(err, req, res, next)')) {
          if (/express|app = express\(\)/.test(content)) {
            issues.push({
              id: `node-missing-error-middleware-${relFile}`,
              category: 'quality',
              severity: 'high',
              title: 'Missing Express Error Middleware',
              description: 'Express app without error-handling middleware (4-argument signature).',
              location: { file: relFile },
              rule: 'express-error-middleware',
              fix: {
                description: 'Add: app.use((err, req, res, next) => { ... })',
                before: 'app.listen(...)',
                after: 'app.use((err, req, res, next) => {\n  res.status(500).json({ error: err.message });\n});\napp.listen(...)',
                automated: false,
              },
              effort: 'easy',
              impact: 'high',
            });
            break;
          }
        }
      }
    }

    return { issues, filesScanned: files.length };
  }
}
