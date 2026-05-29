export const environment = {
  production: true,
  remoteConfigEnabled: (globalThis as any).__env?.remoteConfigEnabled ?? true,
  gaMeasurementId: (globalThis  as any).__env?.gaMeasurementId || 'G-Q6614CGTFQ',
  apiUrl: (globalThis  as any).__env?.apiUrl || 'http://159.89.225.112/api',
  config: (globalThis  as any).__env?.config || {
    authuser: 'auth-user',
    authtoken: 'auth-token',
  },
  firebase: {
    apiKey: "AIzaSyA_GIQFgCEpbPuByXuQwu6-EwPO21pAV7s",
    authDomain: "elykia-47182.firebaseapp.com",
    projectId: "elykia-47182",
    storageBucket: "elykia-47182.firebasestorage.app",
    messagingSenderId: "2548204482",
    appId: "1:2548204482:web:43e1cdbc538fd6ebb2cc5b",
    measurementId: "G-BWKHN9VNQM"
  }
};
