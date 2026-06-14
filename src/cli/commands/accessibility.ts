import { Command } from 'commander';
import { registerScannerCommand } from './_scanner-helper.js';
export function registerAccessibilityCommand(program: Command): void {
  registerScannerCommand(program, 'accessibility', 'accessibility', 'Audit alt tags, labels, ARIA attributes and keyboard navigation');
}
