import { Command } from 'commander';
import { registerScannerCommand } from './_scanner-helper.js';
export function registerArchitectureCommand(program: Command): void {
  registerScannerCommand(program, 'architecture', 'architecture', 'Analyze folder structure, circular deps, layer separation');
}
