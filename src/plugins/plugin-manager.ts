import { CodeSetterPlugin, ScanResult, CodeSetterConfig, Category } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { glob } from 'glob';

class PluginManager {
  private plugins: Map<string, CodeSetterPlugin> = new Map();

  /**
   * Register a custom scanner plugin.
   */
  register(plugin: CodeSetterPlugin): void {
    if (this.plugins.has(plugin.name)) {
      logger.warn(`Plugin "${plugin.name}" is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.name, plugin);
    logger.debug(`Plugin registered: ${plugin.name}`);
  }

  /**
   * Unregister a plugin by name.
   */
  unregister(name: string): void {
    this.plugins.delete(name);
  }

  /**
   * Get all registered plugins.
   */
  getAll(): CodeSetterPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Run all registered plugins and collect results.
   */
  async runAll(config: CodeSetterConfig): Promise<ScanResult[]> {
    if (this.plugins.size === 0) return [];

    const results: ScanResult[] = [];

    for (const plugin of this.plugins.values()) {
      try {
        const start = Date.now();
        const files = (await glob('**/*.{ts,tsx,js,jsx}', {
          cwd: config.path,
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**'],
        }));

        const pluginResult = await plugin.scan(files, config);

        results.push({
          category: 'quality' as Category,
          issues: pluginResult.issues,
          score: pluginResult.score,
          filesScanned: files.length,
          duration: Date.now() - start,
          metadata: pluginResult.metadata,
        });
      } catch (err) {
        logger.warn(`Plugin "${plugin.name}" failed: ${(err as Error).message}`);
      }
    }

    return results;
  }
}

/** Singleton plugin manager instance */
export const pluginManager = new PluginManager();

/**
 * Register a custom scanner plugin.
 * This is the public API for the plugin system.
 */
export function registerPlugin(plugin: CodeSetterPlugin): void {
  pluginManager.register(plugin);
}
