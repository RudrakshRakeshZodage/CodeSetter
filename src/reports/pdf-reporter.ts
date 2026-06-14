import PDFDocument from 'pdfkit';
import { AuditReport, Issue, Category } from '../types/index.js';
import { scoreColor } from '../scoring/scorer.js';
import { ensureDir } from '../utils/file-utils.js';
import path from 'path';
import fs from 'fs';

const AUTHOR = 'Rudraksh Zodage';
const BRAND_COLOR = '#6366f1';
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#3b82f6',
  info:     '#6b7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  quality:       'Code Quality',
  security:      'Security',
  performance:   'Performance',
  accessibility: 'Accessibility',
  testing:       'Testing',
  architecture:  'Architecture',
};

/**
 * Generate a branded PDF audit report.
 * Returns the path of the written PDF file.
 */
export async function generatePdfReport(
  report: AuditReport,
  outputPath: string
): Promise<string> {
  await ensureDir(path.dirname(outputPath));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: 'CodeSetter Audit Report',
        Author: AUTHOR,
        Subject: 'AI-Powered Code Audit',
        Creator: 'CodeSetter v1.1.0',
        Keywords: 'code quality, security, performance, accessibility, testing, architecture',
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ─── Cover Page ──────────────────────────────────────────────────────────
    drawCoverPage(doc, report);

    // ─── Score Summary Page ──────────────────────────────────────────────────
    doc.addPage();
    drawScorePage(doc, report);

    // ─── Issues by Category ──────────────────────────────────────────────────
    for (const result of report.results) {
      if (result.issues.length === 0) continue;
      doc.addPage();
      drawCategoryPage(doc, result.category, result.issues, result.score);
    }

    // ─── AI Insights Page ────────────────────────────────────────────────────
    if (report.ai) {
      doc.addPage();
      drawAIPage(doc, report);
    }

    // ─── Footer on all pages ─────────────────────────────────────────────────
    const pageCount = (doc as PDFKit.PDFDocument & { _pageCount?: number })._pageCount ?? 1;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      drawPageFooter(doc, i + 1);
    }

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// ─── Page Builders ────────────────────────────────────────────────────────────

function drawCoverPage(doc: PDFKit.PDFDocument, report: AuditReport): void {
  const { width, height } = doc.page;

  // Dark background rectangle (top half)
  doc.rect(0, 0, width, height / 2).fill('#0f0f14');

  // Accent bar
  doc.rect(0, height / 2 - 4, width, 8).fill(BRAND_COLOR);

  // Logo / Title
  doc.fillColor(BRAND_COLOR).font('Helvetica-Bold').fontSize(36);
  doc.text('⚡ CodeSetter', 60, 120, { align: 'center' });

  doc.fillColor('#e2e8f0').font('Helvetica').fontSize(14);
  doc.text('AI-Powered Repository Audit Report', 60, 175, { align: 'center' });

  // Big score
  const scoreHex = scoreColor(report.score.overall);
  doc.fillColor(scoreHex).font('Helvetica-Bold').fontSize(80);
  doc.text(`${report.score.overall}`, 0, 230, { align: 'center', width });

  doc.fillColor('#94a3b8').font('Helvetica').fontSize(16);
  doc.text('Overall Score / 100', 0, 320, { align: 'center', width });

  doc.fillColor(gradeHex(report.score.grade)).font('Helvetica-Bold').fontSize(28);
  doc.text(`Grade: ${report.score.grade}`, 0, 355, { align: 'center', width });

  // Info block (white background section)
  doc.fillColor('#1a1a24');
  doc.rect(60, height / 2 + 30, width - 120, 200).fill('#1a1a24');

  doc.fillColor('#94a3b8').font('Helvetica').fontSize(11);
  const infoY = height / 2 + 55;
  const col1 = 90;
  const col2 = width / 2 + 30;

  doc.text('Project Path:', col1, infoY);
  doc.text('Date:', col1, infoY + 25);
  doc.text('Stack:', col1, infoY + 50);
  doc.text('Files Scanned:', col1, infoY + 75);
  doc.text('Total Issues:', col1, infoY + 100);

  doc.fillColor('#e2e8f0').font('Helvetica-Bold').fontSize(11);
  doc.text(report.path, col2, infoY, { width: width - col2 - 60 });
  doc.text(new Date(report.timestamp).toLocaleString(), col2, infoY + 25);
  doc.text(
    `${report.stack.primary}${report.stack.frameworks.length ? ' · ' + report.stack.frameworks.join(', ') : ''}`,
    col2,
    infoY + 50
  );
  doc.text(String(report.summary.totalFiles), col2, infoY + 75);
  doc.text(String(report.summary.totalIssues), col2, infoY + 100);

  // Author credit
  doc.fillColor('#6366f1').font('Helvetica-Bold').fontSize(12);
  doc.text(`By ${AUTHOR}`, 0, height - 100, { align: 'center', width });

  doc.fillColor('#94a3b8').font('Helvetica').fontSize(9);
  doc.text('https://github.com/RudrakshRakeshZodage/CodeSetter', 0, height - 80, {
    align: 'center',
    width,
  });
}

function drawScorePage(doc: PDFKit.PDFDocument, report: AuditReport): void {
  const { width } = doc.page;

  sectionHeader(doc, '📊 Score Breakdown');

  let y = 130;

  for (const [cat, sub] of Object.entries(report.score.subScores)) {
    const label = CATEGORY_LABELS[cat] ?? cat;
    const barWidth = 300;
    const filled = Math.round((sub.score / 100) * barWidth);
    const hex = scoreColor(sub.score);

    // Label
    doc.fillColor('#475569').font('Helvetica').fontSize(11);
    doc.text(label, 60, y + 4, { width: 140 });

    // Bar track
    doc.rect(200, y, barWidth, 16).fill('#1e293b');

    // Bar fill
    doc.rect(200, y, filled, 16).fill(hex);

    // Score number
    doc.fillColor(hex).font('Helvetica-Bold').fontSize(12);
    doc.text(`${sub.score}/100`, 520, y + 2, { width: 60 });

    // Grade
    doc.fillColor(gradeHex(sub.grade)).fontSize(11);
    doc.text(sub.grade, 590, y + 2, { width: 40 });

    // Issue count
    doc.fillColor('#64748b').font('Helvetica').fontSize(9);
    doc.text(`${sub.issueCount} issues`, 200, y + 20, { width: 120 });

    y += 50;
  }

  // Summary stats
  y += 20;
  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(13);
  doc.text('Issue Summary', 60, y);
  y += 25;

  const stats = [
    { label: 'Critical', count: report.summary.criticalIssues, color: '#ef4444' },
    { label: 'High',     count: report.summary.highIssues,     color: '#f97316' },
    { label: 'Medium',   count: report.summary.mediumIssues,   color: '#f59e0b' },
    { label: 'Low',      count: report.summary.lowIssues,      color: '#3b82f6' },
    { label: 'Info',     count: report.summary.infoIssues,     color: '#6b7280' },
  ];

  const cellW = (width - 120) / stats.length;
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const x = 60 + i * cellW;
    doc.rect(x, y, cellW - 10, 60).fill('#1e293b');
    doc.fillColor(s.color).font('Helvetica-Bold').fontSize(22);
    doc.text(String(s.count), x, y + 8, { width: cellW - 10, align: 'center' });
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(9);
    doc.text(s.label, x, y + 38, { width: cellW - 10, align: 'center' });
  }
}

function drawCategoryPage(
  doc: PDFKit.PDFDocument,
  category: Category,
  issues: Issue[],
  score: number
): void {
  const label = CATEGORY_LABELS[category] ?? category;
  sectionHeader(doc, `${label} — Score: ${score}/100`);

  const topIssues = issues
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
    .slice(0, 25);

  let y = 130;
  const { width } = doc.page;

  // Table header
  doc.rect(60, y, width - 120, 22).fill('#1e293b');
  doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(9);
  doc.text('SEVERITY', 68, y + 7, { width: 70 });
  doc.text('ISSUE', 145, y + 7, { width: 200 });
  doc.text('LOCATION', 355, y + 7, { width: 160 });
  y += 28;

  for (const issue of topIssues) {
    if (y > 720) break; // Don't overflow page (will need pagination for large sets)

    const sevColor = SEVERITY_COLORS[issue.severity] ?? '#6b7280';
    const rowBg = topIssues.indexOf(issue) % 2 === 0 ? '#0f172a' : '#1e293b';

    doc.rect(60, y, width - 120, 36).fill(rowBg);

    // Severity badge
    doc.rect(68, y + 8, 60, 16).fill(sevColor + '33');
    doc.fillColor(sevColor).font('Helvetica-Bold').fontSize(8);
    doc.text(issue.severity.toUpperCase(), 69, y + 12, { width: 58, align: 'center' });

    // Title + description
    doc.fillColor('#e2e8f0').font('Helvetica-Bold').fontSize(9);
    doc.text(issue.title, 145, y + 5, { width: 200, ellipsis: true });
    doc.fillColor('#64748b').font('Helvetica').fontSize(8);
    doc.text(issue.description.slice(0, 60) + (issue.description.length > 60 ? '…' : ''), 145, y + 18, {
      width: 200,
    });

    // Location
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8);
    const loc = `${issue.location.file}${issue.location.line ? ':' + issue.location.line : ''}`;
    doc.text(loc.slice(-35), 355, y + 12, { width: 160, ellipsis: true });

    y += 40;
  }

  if (issues.length > 25) {
    doc.fillColor('#64748b').font('Helvetica').fontSize(9);
    doc.text(`... and ${issues.length - 25} more issues. See JSON report for full list.`, 60, y + 10);
  }
}

function drawAIPage(doc: PDFKit.PDFDocument, report: AuditReport): void {
  sectionHeader(doc, '🤖 AI Insights');

  if (!report.ai) return;

  let y = 130;
  const { width } = doc.page;

  doc.fillColor('#475569').font('Helvetica').fontSize(11);
  const summary = report.ai.overallSummary;
  doc.text(summary, 60, y, { width: width - 120 });
  y += doc.heightOfString(summary, { width: width - 120 }) + 20;

  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(12);
  doc.text('Priority Actions', 60, y);
  y += 20;

  for (const action of report.ai.priorityActions.slice(0, 8)) {
    doc.rect(60, y, 8, 8).fill(BRAND_COLOR);
    doc.fillColor('#475569').font('Helvetica').fontSize(10);
    doc.text(action, 80, y, { width: width - 140 });
    y += doc.heightOfString(action, { width: width - 140 }) + 8;
    if (y > 720) break;
  }

  if (report.ai.estimatedFixTime) {
    y += 15;
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(11);
    doc.text(`Estimated Fix Time: `, 60, y, { continued: true });
    doc.fillColor(BRAND_COLOR).text(report.ai.estimatedFixTime);
  }
}

function drawPageFooter(doc: PDFKit.PDFDocument, pageNum: number): void {
  const { width, height } = doc.page;

  doc.rect(0, height - 40, width, 40).fill('#0f0f14');
  doc.fillColor('#475569').font('Helvetica').fontSize(8);
  doc.text(
    `CodeSetter v1.1.0  ·  By ${AUTHOR}  ·  Page ${pageNum}`,
    0,
    height - 25,
    { align: 'center', width }
  );
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  const { width } = doc.page;
  doc.rect(0, 0, width, 90).fill('#0f0f14');
  doc.rect(0, 90, width, 4).fill(BRAND_COLOR);
  doc.fillColor('#e2e8f0').font('Helvetica-Bold').fontSize(20);
  doc.text(title, 60, 32, { width: width - 120 });
}

function gradeHex(grade: string): string {
  if (grade.startsWith('A')) return '#10b981';
  if (grade.startsWith('B')) return '#3b82f6';
  if (grade.startsWith('C')) return '#f59e0b';
  if (grade === 'D') return '#f97316';
  return '#ef4444';
}

function severityOrder(s: string): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s] ?? 5;
}
