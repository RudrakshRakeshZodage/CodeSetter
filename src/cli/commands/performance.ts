import { Command } from 'commander';
import { registerScannerCommand } from './_scanner-helper.js';
export function registerPerformanceCommand(program: Command): void {
  registerScannerCommand(program, 'performance', 'performance', 'Detect heavy deps, nested loops, missing memoization');
}
