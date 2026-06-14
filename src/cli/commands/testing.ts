import { Command } from 'commander';
import { registerScannerCommand } from './_scanner-helper.js';
export function registerTestingCommand(program: Command): void {
  registerScannerCommand(program, 'testing', 'testing', 'Check test coverage and identify untested critical modules');
}
