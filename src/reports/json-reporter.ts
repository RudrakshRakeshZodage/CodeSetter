import { AuditReport } from '../types/index.js';

export function generateJsonReport(report: AuditReport): string {
  // Remove config.ai.apiKey from output for security
  const sanitized: AuditReport = {
    ...report,
    config: {
      ...report.config,
      ai: report.config.ai
        ? { ...report.config.ai, apiKey: '[REDACTED]' }
        : undefined,
    },
  };
  return JSON.stringify(sanitized, null, 2);
}
