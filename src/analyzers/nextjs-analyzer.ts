import { ScanResult, CodeSetterConfig } from '../types/index.js';
import { walkFiles } from '../core/file-walker.js';
import { readFileSafe, relativePath } from '../utils/file-utils.js';

/**
 * Next.js-specific analyzer for Image, Link, and data fetching patterns.
 */
export class NextjsAnalyzer {
  async analyze(dir: string, config: CodeSetterConfig): Promise<Partial<ScanResult>> {
    const files = await walkFiles(dir, {
      extensions: ['tsx', 'jsx', 'ts', 'js'],
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

        // Using <img> instead of next/image
        if (/<img\b/i.test(line) && !/next\/image|Image from/.test(content)) {
          issues.push({
            id: `nextjs-img-component-${relFile}-${i}`,
            category: 'performance',
            severity: 'medium',
            title: 'Use next/image Instead of <img>',
            description: 'next/image provides automatic optimization, lazy loading, and WebP conversion.',
            location: { file: relFile, line: i + 1 },
            rule: 'nextjs/no-img-element',
            fix: {
              description: "Replace <img> with Next.js <Image> component from 'next/image'",
              before: line.trim(),
              after: `import Image from 'next/image';\n<Image src="..." width={} height={} alt="..." />`,
              automated: false,
            },
            effort: 'easy',
            impact: 'medium',
          });
          break;
        }

        // Using <a> instead of next/link
        if (/<a\s+href=/.test(line) && !/next\/link|Link from/.test(content) && !/http/.test(line)) {
          issues.push({
            id: `nextjs-link-component-${relFile}-${i}`,
            category: 'performance',
            severity: 'low',
            title: 'Use next/link Instead of <a>',
            description: 'next/link enables client-side navigation and prefetching.',
            location: { file: relFile, line: i + 1 },
            rule: 'nextjs/no-html-link-for-pages',
            fix: {
              description: "Replace <a href> with Next.js <Link> from 'next/link'",
              before: line.trim(),
              after: `import Link from 'next/link';\n<Link href="...">text</Link>`,
              automated: false,
            },
            effort: 'easy',
            impact: 'low',
          });
          break;
        }
      }
    }

    return { issues, filesScanned: files.length };
  }
}
