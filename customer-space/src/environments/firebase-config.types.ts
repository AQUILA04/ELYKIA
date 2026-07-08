/** Config Firebase Web SDK — valeurs injectées localement ou en CI (jamais de secrets dans le dépôt). */
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const emptyFirebaseConfig: FirebaseClientConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
