#!/usr/bin/env node
/**
 * Injecte la config Firebase dans environment.ts / environment.prod.ts
 * et écrit android/app/google-services.json si le dossier Android existe.
 *
 * Sources (priorité) :
 *  1. CUSTOMER_SPACE_FIREBASE_WEB_CONFIG — JSON Web SDK (recommandé Phone Auth navigateur)
 *  2. CUSTOMER_SPACE_GOOGLE_SERVICES_JSON — contenu google-services.json (secret CI / env)
 *  3. ./google-services.json — fichier local (dev)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const profile = process.argv.includes('--profile')
  ? process.argv[process.argv.indexOf('--profile') + 1]
  : 'prod';

const envFile = profile === 'dev'
  ? path.join(root, 'src/environments/environment.ts')
  : path.join(root, 'src/environments/environment.prod.ts');

function readGoogleServicesRaw() {
  if (process.env.CUSTOMER_SPACE_GOOGLE_SERVICES_JSON) {
    return process.env.CUSTOMER_SPACE_GOOGLE_SERVICES_JSON;
  }
  const localPath = path.join(root, 'google-services.json');
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath, 'utf8');
  }
  return null;
}

function webConfigFromGoogleServices(raw) {
  const gs = JSON.parse(raw);
  const client = gs.client?.[0];
  const project = gs.project_info;
  if (!client || !project) {
    throw new Error('google-services.json invalide : client[0] ou project_info manquant');
  }
  const apiKey = client.api_key?.[0]?.current_key;
  if (!apiKey) {
    throw new Error('google-services.json invalide : api_key manquant');
  }
  return {
    apiKey,
    authDomain: `${project.project_id}.firebaseapp.com`,
    projectId: project.project_id,
    storageBucket: project.storage_bucket,
    messagingSenderId: project.project_number,
    appId: client.client_info.mobilesdk_app_id,
  };
}

function resolveFirebaseConfig() {
  if (process.env.CUSTOMER_SPACE_FIREBASE_WEB_CONFIG) {
    const config = JSON.parse(process.env.CUSTOMER_SPACE_FIREBASE_WEB_CONFIG);
    return { config, googleServicesRaw: readGoogleServicesRaw() };
  }

  const raw = readGoogleServicesRaw();
  if (!raw) {
    return null;
  }

  return { config: webConfigFromGoogleServices(raw), googleServicesRaw: raw };
}

function patchEnvironmentFile(filePath, firebase) {
  const content = fs.readFileSync(filePath, 'utf8');
  const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const block = `  firebase: {
    apiKey: '${esc(firebase.apiKey)}',
    authDomain: '${esc(firebase.authDomain)}',
    projectId: '${esc(firebase.projectId)}',
    storageBucket: '${esc(firebase.storageBucket)}',
    messagingSenderId: '${esc(firebase.messagingSenderId)}',
    appId: '${esc(firebase.appId)}',
  },`;

  const updated = content.replace(/  firebase: \{[\s\S]*?\n  \},/, block);
  if (updated === content) {
    throw new Error(`Bloc firebase introuvable dans ${path.relative(root, filePath)}`);
  }
  fs.writeFileSync(filePath, updated, 'utf8');
}

function writeAndroidGoogleServices(raw) {
  if (!raw) return;
  const androidDir = path.join(root, 'android');
  if (!fs.existsSync(androidDir)) {
    console.log('android/ absent — google-services.json natif non écrit (exécutez npx cap add android).');
    return;
  }
  const dest = path.join(androidDir, 'app', 'google-services.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const normalized = JSON.stringify(JSON.parse(raw), null, 2);
  fs.writeFileSync(dest, `${normalized}\n`, 'utf8');
  console.log(`Écrit ${path.relative(root, dest)}`);
}

const resolved = resolveFirebaseConfig();
if (!resolved) {
  console.warn(
    'Aucune config Firebase trouvée (CUSTOMER_SPACE_FIREBASE_WEB_CONFIG, '
    + 'CUSTOMER_SPACE_GOOGLE_SERVICES_JSON ou google-services.json). Injection ignorée.',
  );
  process.exit(0);
}

patchEnvironmentFile(envFile, resolved.config);
writeAndroidGoogleServices(resolved.googleServicesRaw);
console.log(`Firebase injecté dans ${path.relative(root, envFile)} (profil ${profile}).`);
