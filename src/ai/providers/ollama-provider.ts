import axios from 'axios';
import { AIConfig } from '../../types/index.js';
import { AIProviderClient } from './openai-provider.js';

export class OllamaProvider implements AIProviderClient {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async complete(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    const model = this.config.model ?? 'codellama';

    const response = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt: `${prompt}\n\nRespond ONLY with valid JSON.`,
        stream: false,
        options: {
          temperature: this.config.temperature ?? 0.3,
          num_predict: this.config.maxTokens ?? 4096,
        },
      },
      { timeout: 120000 }
    );

    return response.data.response as string;
  }
}
