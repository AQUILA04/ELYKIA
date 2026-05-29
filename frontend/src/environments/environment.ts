// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  /** Set to false to skip Firebase Remote Config fetch (local defaults only). */
  remoteConfigEnabled: true,
  gaMeasurementId: 'G-Q6614CGTFQ',
  //apiUrl: 'http://192.168.1.126:8081',
  apiUrl: 'http://localhost:8081', // Base URL de l'API
  config: {
    authuser: 'currentUser',
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

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
