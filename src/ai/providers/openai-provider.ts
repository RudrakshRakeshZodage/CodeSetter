import { AIConfig } from '../../types/index.js';

export interface AIProviderClient {
  complete(prompt: string): Promise<string>;
}

export class OpenAIProvider implements AIProviderClient {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async complete(prompt: string): Promise<string> {
    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
      apiKey: this.config.apiKey ?? process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: this.config.model ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.config.maxTokens ?? 4096,
      temperature: this.config.temperature ?? 0.3,
      response_format: { type: 'json_object' },
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
