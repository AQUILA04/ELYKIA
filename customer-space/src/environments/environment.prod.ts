import { APP_VERSION } from './app-version';
import { firebaseConfig } from './firebase-config';
import { resolveRuntimeApiUrl } from './runtime-env';

// Garder l'URL d'API sur une seule ligne : l'action APK la remplace (sed) par l'URL de la cible.
export const environment = {
  production: true,
  apiUrl: resolveRuntimeApiUrl('https://elykia.amenouveve-yaveh.com/api'),
  appName: 'ELYKIA Espace Client',
  version: APP_VERSION,
  firebase: firebaseConfig,
  remoteConfigEnabled: true,
  telemetryEnabled: true,
};
