import { APP_VERSION } from './app-version';
import { firebaseConfig } from './firebase-config';

export const environment = {
  production: true,
  apiUrl: 'https://elykia.amenouveve-yaveh.com',
  appName: 'ELYKIA Espace Client',
  version: APP_VERSION,
  firebase: firebaseConfig,
  remoteConfigEnabled: true,
};
