// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.

import { APP_VERSION } from './app-version';
import { firebaseConfig } from './firebase-config';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
  appName: 'ELYKIA Espace Client',
  version: APP_VERSION,
  firebase: firebaseConfig,
};
