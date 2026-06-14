import { AuditReport, Issue, Category } from '../types/index.js';
import { scoreColor, gradeColor } from '../scoring/scorer.js';

const CATEGORY_ICONS: Record<Category | string, string> = {
  quality: '🔍',
  security: '🛡️',
  performance: '⚡',
  accessibility: '♿',
  testing: '🧪',
  architecture: '🏗️',
  dependencies: '📦',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  info: '#6b7280',
};

export function generateHtmlReport(report: AuditReport): string {
  const { score, summary, stack, results, ai } = report;

  const allIssues = results.flatMap((r) => r.issues);
  const critical = allIssues.filter((i) => i.severity === 'critical');
  const high = allIssues.filter((i) => i.severity === 'high');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CodeSetter Audit Report — ${new Date(report.timestamp).toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0f0f14;
      --surface: #1a1a24;
      --border: #2a2a38;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #6366f1;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      display: flex; align-items: center; gap: 1rem;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .logo {
      font-size: 2rem; font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .meta { color: var(--muted); font-size: 0.875rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }
    .score-card { text-align: center; padding: 2rem; }
    .score-number {
      font-size: 5rem; font-weight: 900; line-height: 1;
      background: linear-gradient(135deg, ${scoreColor(score.overall)}, ${scoreColor(score.overall)}aa);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .grade-badge {
      display: inline-block;
      background: ${gradeColor(score.grade)};
      color: white; padding: 0.25rem 0.75rem;
      border-radius: 9999px; font-weight: 700; font-size: 1.1rem;
      margin-top: 0.5rem;
    }
    .bar-container { display: flex; align-items: center; gap: 0.75rem; margin: 0.5rem 0; }
    .bar-label { width: 120px; font-size: 0.875rem; color: var(--muted); text-transform: capitalize; }
    .bar-track { flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .bar-score { width: 50px; text-align: right; font-size: 0.875rem; font-weight: 600; }
    .issues-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-top: 1rem; }
    .issues-table th { text-align: left; padding: 0.5rem 0.75rem; color: var(--muted); border-bottom: 1px solid var(--border); font-weight: 500; }
    .issues-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border)22; vertical-align: top; }
    .issues-table tr:hover td { background: var(--border)44; }
    .badge {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px;
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .section-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .stat-item { text-align: center; padding: 1rem; background: var(--bg); border-radius: 8px; }
    .stat-number { font-size: 1.75rem; font-weight: 800; }
    .stat-label { font-size: 0.75rem; color: var(--muted); margin-top: 0.25rem; }
    .ai-insight { background: linear-gradient(135deg, #1e1b4b, #1a1a24); border: 1px solid #4338ca44; border-radius: 8px; padding: 1rem; margin-top: 0.75rem; }
    .ai-insight h4 { color: #818cf8; margin-bottom: 0.5rem; }
    .fix-block { background: var(--bg); border-radius: 6px; padding: 0.75rem; margin-top: 0.5rem; font-family: monospace; font-size: 0.8rem; }
    .fix-before { color: #f87171; }
    .fix-after { color: #4ade80; }
    footer { text-align: center; color: var(--muted); font-size: 0.75rem; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
    @media (max-width: 768px) { body { padding: 1rem; } .score-number { font-size: 3.5rem; } }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body>
<div class="container">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">⚡ CodeSetter</div>
      <div class="meta">
        Audit Report · ${new Date(report.timestamp).toLocaleString()} ·
        ${report.path} · ${stack.primary} ${stack.frameworks.join(', ')}
      </div>
    </div>
  </div>

  <!-- Overall Score + Summary Stats -->
  <div class="grid" style="grid-template-columns: 280px 1fr">
    <div class="card score-card">
      <div style="color: var(--muted); font-size: 0.875rem; margin-bottom: 0.5rem">OVERALL SCORE</div>
      <div class="score-number">${score.overall}</div>
      <div style="color: var(--muted); font-size: 0.875rem">/100</div>
      <div class="grade-badge">${score.grade}</div>
      <div style="margin-top: 1rem; color: var(--muted); font-size: 0.75rem">
        Scanned in ${(report.duration / 1000).toFixed(1)}s
      </div>
    </div>
    <div class="card">
      <div class="section-title">📊 Summary</div>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-number" style="color:#ef4444">${summary.criticalIssues}</div>
          <div class="stat-label">Critical</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" style="color:#f97316">${summary.highIssues}</div>
          <div class="stat-label">High</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" style="color:#f59e0b">${summary.mediumIssues}</div>
          <div class="stat-label">Medium</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" style="color:#3b82f6">${summary.lowIssues}</div>
          <div class="stat-label">Low</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" style="color:#6b7280">${summary.infoIssues}</div>
          <div class="stat-label">Info</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" style="color:var(--text)">${summary.totalFiles}</div>
          <div class="stat-label">Files</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Sub Scores -->
  <div class="card" style="margin-bottom: 1rem">
    <div class="section-title">🎯 Category Scores</div>
    ${Object.entries(score.subScores)
      .map(([cat, sub]) => {
        const color = scoreColor(sub.score);
        return `
      <div class="bar-container">
        <div class="bar-label">${CATEGORY_ICONS[cat] ?? ''} ${cat}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${sub.score}%;background:${color}"></div>
        </div>
        <div class="bar-score" style="color:${color}">${sub.score}</div>
        <div style="width:36px;text-align:right">
          <span class="badge" style="background:${gradeColor(sub.grade)}22;color:${gradeColor(sub.grade)}">${sub.grade}</span>
        </div>
      </div>`;
      })
      .join('')}
  </div>

  <!-- AI Insights -->
  ${
    ai
      ? `<div class="card" style="margin-bottom: 1rem">
    <div class="section-title">🤖 AI Insights</div>
    <p style="color:var(--muted);font-size:0.875rem;margin-bottom:1rem">${ai.overallSummary}</p>
    <div style="margin-bottom:1rem">
      <strong style="font-size:0.875rem;color:#818cf8">Priority Actions:</strong>
      <ul style="margin-top:0.5rem;padding-left:1.25rem;font-size:0.875rem">
        ${ai.priorityActions.map((a) => `<li style="margin-bottom:0.25rem">${a}</li>`).join('')}
      </ul>
    </div>
    ${ai.insights
      .slice(0, 3)
      .map(
        (insight) => `
    <div class="ai-insight">
      <h4>${CATEGORY_ICONS[insight.category] ?? ''} ${insight.category} Insights</h4>
      <p style="font-size:0.875rem;color:var(--muted)">${insight.summary}</p>
    </div>`
      )
      .join('')}
  </div>`
      : ''
  }

  <!-- Issues by Category -->
  ${results
    .map((result) => {
      if (result.issues.length === 0) return '';
      const topIssues = result.issues
        .sort((a, b) => {
          const order = ['critical', 'high', 'medium', 'low', 'info'];
          return order.indexOf(a.severity) - order.indexOf(b.severity);
        })
        .slice(0, 50);

      return `
  <div class="card" style="margin-bottom: 1rem">
    <div class="section-title">
      ${CATEGORY_ICONS[result.category] ?? ''} ${result.category.charAt(0).toUpperCase() + result.category.slice(1)} Issues
      <span class="badge" style="background:${scoreColor(result.score)}22;color:${scoreColor(result.score)};margin-left:auto">
        Score: ${result.score}
      </span>
    </div>
    <table class="issues-table">
      <thead>
        <tr>
          <th>Severity</th>
          <th>Issue</th>
          <th>Location</th>
          <th>Fix</th>
        </tr>
      </thead>
      <tbody>
        ${topIssues
          .map(
            (issue) => `
        <tr>
          <td>
            <span class="badge" style="background:${SEVERITY_COLORS[issue.severity]}22;color:${SEVERITY_COLORS[issue.severity]}">
              ${issue.severity}
            </span>
          </td>
          <td>
            <div style="font-weight:600;margin-bottom:0.25rem">${escapeHtml(issue.title)}</div>
            <div style="color:var(--muted);font-size:0.8rem">${escapeHtml(issue.description)}</div>
          </td>
          <td style="color:var(--muted);font-size:0.8rem;white-space:nowrap">
            ${escapeHtml(issue.location.file)}${issue.location.line ? `:${issue.location.line}` : ''}
          </td>
          <td style="font-size:0.8rem">
            ${
              issue.fix
                ? `<div>${escapeHtml(issue.fix.description)}</div>
                ${
                  issue.fix.before && issue.fix.after
                    ? `<div class="fix-block">
                  <div class="fix-before">- ${escapeHtml(issue.fix.before)}</div>
                  <div class="fix-after">+ ${escapeHtml(issue.fix.after)}</div>
                </div>`
                    : ''
                }`
                : '<span style="color:var(--muted)">—</span>'
            }
          </td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
    ${result.issues.length > 50 ? `<div style="text-align:center;color:var(--muted);font-size:0.8rem;margin-top:0.75rem">Showing 50 of ${result.issues.length} issues</div>` : ''}
  </div>`;
    })
    .join('')}

  <footer>
    Generated by <strong>CodeSetter v${report.version}</strong> ·
    <a href="https://github.com/RudrakshRakeshZodage/CodeSetter" style="color:#6366f1">GitHub</a>
    · Audit ID: ${report.id}
  </footer>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
