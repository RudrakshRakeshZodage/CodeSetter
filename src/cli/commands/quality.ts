import { Command } from 'commander';
import { registerScannerCommand } from './_scanner-helper.js';
export function registerQualityCommand(program: Command): void {
  registerScannerCommand(program, 'quality', 'quality', 'Analyze code quality: complexity, nesting, unused vars');
}
