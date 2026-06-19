/** Environment pour builds et tests E2E (API mockée via Playwright). */
export const environment = {
  production: false,
  e2e: true,
  apiUrl: 'http://localhost:8080',
  appName: 'ELYKIA Espace Client',
  version: '1.0.0',
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
};
