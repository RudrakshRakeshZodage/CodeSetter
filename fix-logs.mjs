import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function main() {
  const files = await glob('src/**/*.ts', { absolute: true });
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(\s*)\/\/ (.*) \/\/ TODO: use a proper logger\r?$/);
      if (match) {
        lines[i] = match[1] + match[2] + (lines[i].endsWith('\r') ? '\r' : '');
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, lines.join('\n'));
      console.log(`Fixed ${file}`);
    }
  }
}
main();
