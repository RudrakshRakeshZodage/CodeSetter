import { Command } from 'commander';
import { registerScannerCommand } from './_scanner-helper.js';
export function registerSecurityCommand(program: Command): void {
  registerScannerCommand(program, 'security', 'security', 'Scan for secrets, SQL injection, XSS, eval and npm vulnerabilities');
}
