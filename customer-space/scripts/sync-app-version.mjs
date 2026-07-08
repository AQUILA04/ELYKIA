#!/usr/bin/env node
/**
 * Aligne app-version.ts et les environment*.ts sur package.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;

const appVersionPath = path.join(root, 'src/environments/app-version.ts');
fs.writeFileSync(
  appVersionPath,
  `/** Synchronisé depuis package.json via \`npm run sync:version\`. */\nexport const APP_VERSION = '${version}';\n`,
  'utf8',
);

const envFiles = [
  'src/environments/environment.ts',
  'src/environments/environment.prod.ts',
  'src/environments/environment.e2e.ts',
];

for (const rel of envFiles) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(/version:\s*['"][^'"]+['"]/, `version: '${version}'`);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
}

console.log(`Version app synchronisée : ${version}`);
