import readline from 'readline';
import chalk from 'chalk';

export interface RateLimitState {
  apiKey: string;
  provider: string;
  callCount: number;
  limitHit: boolean;
}

const state: RateLimitState = {
  apiKey: '',
  provider: '',
  callCount: 0,
  limitHit: false,
};

/**
 * Check if an error is an API rate limit error.
 */
export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as Error).message?.toLowerCase() ?? '';
  const status = (err as { status?: number }).status;
  return (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('quota exceeded') ||
    msg.includes('too many requests') ||
    msg.includes('resource_exhausted') ||
    msg.includes('insufficient_quota')
  );
}

/**
 * Prompt the user for a new API key when rate limit is hit.
 * Returns the new key they entered.
 */
export async function promptForNewApiKey(provider: string): Promise<string> {
  return new Promise((resolve) => {
    console.log('');
    console.log(
      chalk.yellow(`  ⚠  API rate limit reached for ${chalk.bold(provider)}.`)
    );
    console.log(
      chalk.gray(
        `  You can get a new key at:\n` +
        (provider === 'openai'
          ? `  https://platform.openai.com/api-keys`
          : provider === 'gemini'
          ? `  https://aistudio.google.com/app/apikey`
          : `  (Ollama runs locally — no key needed)`)
      )
    );
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Mask input
    rl.question(
      chalk.cyan(`  Enter a new ${provider} API key (or press Enter to skip AI): `),
      (answer) => {
        rl.close();
        resolve(answer.trim());
      }
    );
  });
}

/**
 * Track API call and update state.
 */
export function trackCall(provider: string, key: string): void {
  state.provider = provider;
  state.apiKey = key;
  state.callCount++;
}

/**
 * Wrap an AI provider call with automatic rate-limit retry.
 * If rate-limited, prompts the user for a new API key and retries once.
 */
export async function withRateLimitRetry<T>(
  provider: string,
  currentKey: string,
  fn: (key: string) => Promise<T>,
  onNewKey?: (newKey: string) => void
): Promise<T> {
  trackCall(provider, currentKey);
  try {
    return await fn(currentKey);
  } catch (err) {
    if (isRateLimitError(err)) {
      state.limitHit = true;
      const newKey = await promptForNewApiKey(provider);
      if (!newKey) {
        throw new Error('Rate limit hit and no new key provided. Skipping AI analysis.');
      }
      if (onNewKey) onNewKey(newKey);
      trackCall(provider, newKey);
      return await fn(newKey);
    }
    throw err;
  }
}

export function getCallCount(): number {
  return state.callCount;
}
