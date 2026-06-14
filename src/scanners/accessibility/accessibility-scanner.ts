import { ScanResult, Issue, CodeSetterConfig } from '../../types/index.js';
import { walkTemplateFiles, walkFiles } from '../../core/file-walker.js';
import { readFileSafe, relativePath } from '../../utils/file-utils.js';

export class AccessibilityScanner {
  async scan(dir: string, config: CodeSetterConfig): Promise<ScanResult> {
    const start = Date.now();

    const htmlFiles = await walkTemplateFiles(dir, config.ignore);
    const jsxFiles = await walkFiles(dir, {
      extensions: ['tsx', 'jsx'],
      ignore: config.ignore,
      includeTests: false,
    });

    const allFiles = [...new Set([...htmlFiles, ...jsxFiles])];
    const issues: Issue[] = [];

    for (const file of allFiles) {
      const content = await readFileSafe(file);
      if (!content) continue;

      const relFile = relativePath(file, dir);
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // ─── Missing alt on <img> ──────────────────────────────────────────
        if (/<img\b/i.test(line) && !/\balt\s*=/i.test(line)) {
          issues.push({
            id: `a11y-img-alt-${relFile}-${lineNum}`,
            category: 'accessibility',
            severity: 'high',
            title: 'Missing alt Attribute on <img>',
            description: 'Images must have alt text for screen readers.',
            location: { file: relFile, line: lineNum },
            rule: 'img-alt',
            fix: {
              description: 'Add descriptive alt attribute, or alt="" for decorative images',
              before: line.trim(),
              after: line.trim().replace(/<img\b/, '<img alt="Description of image"'),
              automated: true,
            },
            effort: 'trivial',
            impact: 'high',
            references: ['https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'],
          });
        }

        // ─── Input without label ──────────────────────────────────────────
        if (
          /<input\b/i.test(line) &&
          !/type\s*=\s*['"](?:hidden|submit|reset|button|image)['"]/.test(line) &&
          !/\b(?:aria-label|aria-labelledby|id)\s*=/.test(line)
        ) {
          issues.push({
            id: `a11y-input-label-${relFile}-${lineNum}`,
            category: 'accessibility',
            severity: 'high',
            title: 'Input Missing Label',
            description: 'Form inputs must have associated labels for accessibility.',
            location: { file: relFile, line: lineNum },
            rule: 'label-for-input',
            fix: {
              description: 'Add aria-label, aria-labelledby, or associate a <label> element',
              before: line.trim(),
              after: line.trim().replace(/<input\b/, '<input aria-label="Field description"'),
              automated: true,
            },
            effort: 'trivial',
            impact: 'high',
            references: ['https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html'],
          });
        }

        // ─── Interactive div without role ────────────────────────────────
        if (
          /<div\b[^>]*onClick/i.test(line) &&
          !/role\s*=/.test(line) &&
          !/tabIndex/.test(line)
        ) {
          issues.push({
            id: `a11y-div-button-${relFile}-${lineNum}`,
            category: 'accessibility',
            severity: 'medium',
            title: 'Non-Semantic Interactive Element',
            description: 'Clickable <div> without role="button". Use <button> or add role + tabIndex.',
            location: { file: relFile, line: lineNum },
            rule: 'interactive-element-semantics',
            fix: {
              description: 'Replace <div onClick> with <button> or add role="button" tabIndex={0}',
              before: line.trim(),
              after: line.trim().replace('<div', '<button').replace('</div>', '</button>'),
              automated: false,
            },
            effort: 'easy',
            impact: 'medium',
            references: ['https://www.w3.org/WAI/ARIA/apg/patterns/button/'],
          });
        }

        // ─── Missing role on icon-only buttons ───────────────────────────
        if (/<button\b[^>]*>/i.test(line) && !/>.*?<\/button>/.test(line)) {
          const nextFewLines = lines.slice(i, i + 3).join(' ');
          const hasText = />\s*[A-Za-z]/.test(nextFewLines);
          const hasAriaLabel = /aria-label|aria-labelledby/.test(nextFewLines);
          if (!hasText && !hasAriaLabel) {
            issues.push({
              id: `a11y-button-label-${relFile}-${lineNum}`,
              category: 'accessibility',
              severity: 'medium',
              title: 'Icon-Only Button Missing aria-label',
              description: 'Button with no visible text needs aria-label for screen readers.',
              location: { file: relFile, line: lineNum },
              rule: 'button-aria-label',
              fix: {
                description: 'Add aria-label to the <button> element',
                before: line.trim(),
                after: line.trim().replace(/<button\b/, '<button aria-label="Action description"'),
                automated: true,
              },
              effort: 'trivial',
              impact: 'medium',
            });
          }
        }

        // ─── Missing lang attribute on <html> ────────────────────────────
        if (/<html\b/i.test(line) && !/\blang\s*=/.test(line)) {
          issues.push({
            id: `a11y-html-lang-${relFile}-${lineNum}`,
            category: 'accessibility',
            severity: 'medium',
            title: 'Missing lang Attribute on <html>',
            description: 'The <html> element must have a lang attribute to help screen readers.',
            location: { file: relFile, line: lineNum },
            rule: 'html-has-lang',
            fix: {
              description: 'Add lang attribute: <html lang="en">',
              before: line.trim(),
              after: line.trim().replace(/<html\b/, '<html lang="en"'),
              automated: true,
            },
            effort: 'trivial',
            impact: 'medium',
            references: ['https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html'],
          });
        }

        // ─── Heading level skip (h1 → h3 etc.) ───────────────────────────
        const headingMatch = line.match(/<h([1-6])\b/i);
        if (headingMatch) {
          const level = parseInt(headingMatch[1], 10);
          if (level > 2) {
            const prevContent = lines.slice(Math.max(0, i - 20), i).join('\n');
            const prevLevelExists = new RegExp(`<h${level - 1}\\b`, 'i').test(prevContent);
            if (!prevLevelExists) {
              issues.push({
                id: `a11y-heading-skip-${relFile}-${lineNum}`,
                category: 'accessibility',
                severity: 'low',
                title: 'Heading Level Skip',
                description: `<h${level}> used without a preceding <h${level - 1}>. Keep heading hierarchy sequential.`,
                location: { file: relFile, line: lineNum },
                rule: 'heading-order',
                fix: {
                  description: `Use headings in order: h1 → h2 → h3. Don't skip levels for styling.`,
                  automated: false,
                },
                effort: 'easy',
                impact: 'low',
              });
            }
          }
        }

        // ─── Missing focus styles check ──────────────────────────────────
        if (/outline\s*:\s*0|outline\s*:\s*none/.test(line) && !/focus-visible/.test(line)) {
          issues.push({
            id: `a11y-outline-none-${relFile}-${lineNum}`,
            category: 'accessibility',
            severity: 'medium',
            title: 'Removed Focus Outline',
            description: 'Removing outline without a focus-visible replacement breaks keyboard navigation.',
            location: { file: relFile, line: lineNum },
            rule: 'focus-visible',
            fix: {
              description: 'Use :focus-visible pseudo-class to provide visible keyboard focus',
              before: 'outline: none',
              after: ':focus-visible { outline: 2px solid #0ea5e9; }',
              automated: false,
            },
            effort: 'easy',
            impact: 'high',
          });
        }
      }
    }

    const score = computeA11yScore(issues);

    return {
      category: 'accessibility',
      issues,
      score,
      filesScanned: allFiles.length,
      duration: Date.now() - start,
    };
  }
}

function computeA11yScore(issues: Issue[]): number {
  const penalties = { critical: 15, high: 10, medium: 5, low: 2, info: 0 };
  const total = issues.reduce((sum, i) => sum + (penalties[i.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - total));
}
