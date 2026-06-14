import { AIConfig } from '../../types/index.js';
import { AIProviderClient } from './openai-provider.js';

export class GeminiProvider implements AIProviderClient {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async complete(prompt: string): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const apiKey = this.config.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.config.model ?? 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: this.config.maxTokens ?? 4096,
        temperature: this.config.temperature ?? 0.3,
      },
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
