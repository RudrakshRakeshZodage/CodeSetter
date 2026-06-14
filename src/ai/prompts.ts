import { AuditReport, Category } from '../types/index.js';

export function buildCodeReviewPrompt(report: AuditReport): string {
  const { score, summary, results } = report;

  const topIssues = results
    .flatMap((r) => r.issues)
    .filter((i) => i.severity === 'critical' || i.severity === 'high')
    .slice(0, 20)
    .map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description} (${i.location.file}${i.location.line ? ':' + i.location.line : ''})`)
    .join('\n');

  return `You are an expert code reviewer and software architect. Analyze this CodeSetter audit report and provide actionable insights.

## Project Audit Summary
- Overall Score: ${score.overall}/100 (Grade: ${score.grade})
- Total Issues: ${summary.totalIssues} (${summary.criticalIssues} critical, ${summary.highIssues} high)
- Stack: ${report.stack.primary} ${report.stack.frameworks.join(', ')}

## Sub-scores
${Object.entries(score.subScores)
  .map(([cat, sub]) => `- ${cat}: ${sub.score}/100 (${sub.issueCount} issues)`)
  .join('\n')}

## Top Critical/High Issues
${topIssues || 'No critical issues found.'}

## Instructions
Please provide:
1. A 2-3 sentence overall summary of the codebase health
2. Top 5 priority actions the team should take immediately
3. For each category with a score below 70, specific actionable recommendations
4. Estimated time to fix the critical issues

Respond in JSON format:
{
  "overallSummary": "string",
  "priorityActions": ["string"],
  "insights": [
    {
      "category": "quality|security|performance|accessibility|testing|architecture",
      "summary": "string",
      "suggestions": ["string"],
      "codeExamples": [{ "before": "string", "after": "string", "explanation": "string" }]
    }
  ],
  "estimatedFixTime": "string"
}`;
}

export function buildSecurityPrompt(category: Category, issues: string[]): string {
  return `You are a security expert. Review these ${category} issues and provide remediation guidance:

${issues.join('\n')}

For each critical issue, provide:
1. Why it's dangerous
2. Step-by-step fix
3. Code example

Be concise and actionable.`;
}

export function buildRefactoringPrompt(code: string, issue: string): string {
  return `You are a senior software engineer. Refactor this code to fix the following issue:

Issue: ${issue}

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. Refactored code
2. Explanation of changes
3. Any additional improvements

Keep the same functionality, just improve the code quality.`;
}
