import path from 'path';
import { AuditReport, ReportFormat } from '../types/index.js';
import { writeFile, ensureDir } from '../utils/file-utils.js';
import { generateJsonReport } from './json-reporter.js';
import { generateMarkdownReport } from './markdown-reporter.js';
import { generatePdfReport } from './pdf-reporter.js';

export interface ReportManagerOptions {
  formats: Array<ReportFormat | 'pdf'>;
  outputDir: string;
  filename?: string;
}

export interface ReportPaths {
  json?: string;
  markdown?: string;
  pdf?: string;
}

/**
 * Generate and write all requested report formats into separate sub-directories:
 *   <outputDir>/json/audit-report.json
 *   <outputDir>/markdown/audit-report.md
 *   <outputDir>/pdf/audit-report.pdf
 */
export async function generateReports(
  report: AuditReport,
  options: ReportManagerOptions
): Promise<ReportPaths> {
  const { formats, outputDir, filename = 'audit-report' } = options;
  const paths: ReportPaths = {};

  for (const format of formats) {
    switch (format) {
      case 'json': {
        const dir = path.join(outputDir, 'json');
        await ensureDir(dir);
        const filePath = path.join(dir, `${filename}.json`);
        await writeFile(filePath, generateJsonReport(report));
        paths.json = filePath;
        break;
      }

      case 'markdown': {
        const dir = path.join(outputDir, 'markdown');
        await ensureDir(dir);
        const filePath = path.join(dir, `${filename}.md`);
        await writeFile(filePath, generateMarkdownReport(report));
        paths.markdown = filePath;
        break;
      }

      case 'pdf': {
        const dir = path.join(outputDir, 'pdf');
        const filePath = path.join(dir, `${filename}.pdf`);
        await generatePdfReport(report, filePath);
        paths.pdf = filePath;
        break;
      }

      // Legacy 'html' format mapped to pdf for this version
      case 'html': {
        const dir = path.join(outputDir, 'pdf');
        const filePath = path.join(dir, `${filename}.pdf`);
        await generatePdfReport(report, filePath);
        paths.pdf = filePath;
        break;
      }
    }
  }

  return paths;
}
