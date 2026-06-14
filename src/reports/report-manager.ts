import path from 'path';
import { AuditReport, ReportFormat } from '../types/index.js';
import { writeFile, ensureDir } from '../utils/file-utils.js';
import { generateHtmlReport } from './html-reporter.js';
import { generateJsonReport } from './json-reporter.js';
import { generateMarkdownReport } from './markdown-reporter.js';

export interface ReportManagerOptions {
  formats: ReportFormat[];
  outputDir: string;
  filename?: string;
}

export interface ReportPaths {
  html?: string;
  json?: string;
  markdown?: string;
}

/**
 * Generate and write all requested report formats to the output directory.
 */
export async function generateReports(
  report: AuditReport,
  options: ReportManagerOptions
): Promise<ReportPaths> {
  const { formats, outputDir, filename = 'audit-report' } = options;

  await ensureDir(outputDir);

  const paths: ReportPaths = {};

  for (const format of formats) {
    let content: string;
    let ext: string;

    switch (format) {
      case 'html':
        content = generateHtmlReport(report);
        ext = 'html';
        break;
      case 'json':
        content = generateJsonReport(report);
        ext = 'json';
        break;
      case 'markdown':
        content = generateMarkdownReport(report);
        ext = 'md';
        break;
      default:
        continue;
    }

    const filePath = path.join(outputDir, `${filename}.${ext}`);
    await writeFile(filePath, content);
    paths[format] = filePath;
  }

  return paths;
}
