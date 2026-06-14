import { AIConfig, AIProvider } from '../types/index.js';
import { AIProviderClient, OpenAIProvider } from './providers/openai-provider.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import { OllamaProvider } from './providers/ollama-provider.js';

/**
 * Factory — create an AI client based on the provider config.
 */
export function createAIClient(config: AIConfig): AIProviderClient {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider as string}`);
  }
}

export type { AIProviderClient };
