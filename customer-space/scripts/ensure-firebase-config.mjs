#!/usr/bin/env node
/**
 * Garantit l'existence de firebase.config.local.ts (gitignored) à partir du modèle.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const localPath = path.join(root, 'src/environments/firebase.config.local.ts');
const examplePath = path.join(root, 'src/environments/firebase.config.local.example.ts');

if (!fs.existsSync(localPath)) {
  fs.copyFileSync(examplePath, localPath);
  console.log('Créé src/environments/firebase.config.local.ts (vide — exécutez npm run firebase:configure:dev).');
}
