import { AuditReport, AIAnalysis, AIConfig } from '../types/index.js';
import { createAIClient } from './ai-client.js';
import { buildCodeReviewPrompt } from './prompts.js';
import { logger } from '../utils/logger.js';
import { withRateLimitRetry } from './rate-limiter.js';

/**
 * Run AI analysis on an audit report, with automatic rate-limit handling.
 * If the API limit is hit, the user will be prompted inline for a new key.
 */
export async function runAIAnalysis(
  report: AuditReport,
  config: AIConfig
): Promise<AIAnalysis | null> {
  try {
    const prompt = buildCodeReviewPrompt(report);
    let currentKey = config.apiKey ?? '';

    const raw = await withRateLimitRetry(
      config.provider,
      currentKey,
      async (key: string) => {
        const clientConfig = { ...config, apiKey: key };
        const client = createAIClient(clientConfig);
        return client.complete(prompt);
      },
      (newKey: string) => {
        currentKey = newKey;
        logger.info(`Retrying with new API key...`);
      }
    );

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
