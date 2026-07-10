/** Environment pour builds et tests E2E (API mockée via Playwright). */
import { APP_VERSION } from './app-version';
import { emptyFirebaseConfig } from './firebase-config.types';

export const environment = {
  production: false,
  e2e: true,
  apiUrl: 'http://localhost:8080',
  appName: 'ELYKIA Espace Client',
  version: APP_VERSION,
  firebase: emptyFirebaseConfig,
  remoteConfigEnabled: false,
};
