import { ScanResult, CodeSetterConfig } from '../types/index.js';
import { walkFiles } from '../core/file-walker.js';
import { readFileSafe, relativePath } from '../utils/file-utils.js';

/**
 * React-specific analyzer for hooks, prop drilling, and key prop detection.
 */
export class ReactAnalyzer {
  async analyze(dir: string, config: CodeSetterConfig): Promise<Partial<ScanResult>> {
    const files = await walkFiles(dir, {
      extensions: ['tsx', 'jsx'],
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

        // Missing key prop in list rendering
        if (
          (/\.map\s*\(/.test(line) || /\.map\s*\(\s*\(/.test(line)) &&
          !lines.slice(i, i + 5).join('').includes('key=')
        ) {
          issues.push({
            id: `react-missing-key-${relFile}-${i}`,
            category: 'quality',
            severity: 'medium',
            title: 'Missing key Prop in List',
            description: 'List rendering without key prop causes React reconciliation issues.',
            location: { file: relFile, line: i + 1 },
            rule: 'react/key',
            fix: {
              description: 'Add a unique key prop to the root element in each .map() callback',
              before: '.map((item) => <div>...</div>)',
              after: '.map((item) => <div key={item.id}>...</div>)',
              automated: false,
            },
            effort: 'trivial',
            impact: 'medium',
          });
        }

        // Prop drilling (passing props more than 3 levels deep — heuristic)
        const propDrillingDepth = (line.match(/\bprops\.\w+/g) ?? []).length;
        if (propDrillingDepth > 3) {
          issues.push({
            id: `react-prop-drilling-${relFile}-${i}`,
            category: 'quality',
            severity: 'low',
            title: 'Possible Prop Drilling',
            description: `${propDrillingDepth} props accessed from props. Consider Context API or state management.`,
            location: { file: relFile, line: i + 1 },
            rule: 'react-prop-drilling',
            fix: {
              description: 'Use React.createContext() or Zustand/Redux for shared state',
              automated: false,
            },
            effort: 'hard',
            impact: 'medium',
          });
        }

        // useState instead of useReducer for complex state
        const stateCount = (content.match(/\buseState\s*\(/g) ?? []).length;
        if (stateCount > 5 && !/useReducer/.test(content)) {
          issues.push({
            id: `react-complex-state-${relFile}`,
            category: 'quality',
            severity: 'low',
            title: 'Complex State with Multiple useState',
            description: `${stateCount} useState calls. Consider useReducer for complex state logic.`,
            location: { file: relFile },
            rule: 'react-use-reducer',
            fix: {
              description: 'Consolidate related state with useReducer()',
              automated: false,
            },
            effort: 'medium',
            impact: 'low',
          });
          break;
        }
      }
    }

    return { issues, filesScanned: files.length };
  }
}
