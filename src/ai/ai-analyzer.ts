import { AuditReport, AIAnalysis, AIConfig } from '../types/index.js';
import { createAIClient } from './ai-client.js';
import { buildCodeReviewPrompt } from './prompts.js';
import { logger } from '../utils/logger.js';

/**
 * Run AI analysis on an audit report.
 */
export async function runAIAnalysis(
  report: AuditReport,
  config: AIConfig
): Promise<AIAnalysis | null> {
  const client = createAIClient(config);

  try {
    const prompt = buildCodeReviewPrompt(report);
    const raw = await client.complete(prompt);

    // Parse response
    let parsed: AIAnalysis;
    try {
      const json = JSON.parse(raw);
      parsed = {
        overallSummary: json.overallSummary ?? 'No summary provided.',
        priorityActions: json.priorityActions ?? [],
        insights: json.insights ?? [],
        estimatedFixTime: json.estimatedFixTime ?? 'Unknown',
      };
    } catch {
      // Fallback: AI returned non-JSON
      parsed = {
        overallSummary: raw.slice(0, 500),
        priorityActions: [],
        insights: [],
        estimatedFixTime: 'Unknown',
      };
    }

    return parsed;
  } catch (err) {
    logger.warn(`AI analysis failed: ${(err as Error).message}`);
    return null;
  }
}

export { createAIClient };
