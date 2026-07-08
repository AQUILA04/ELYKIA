import { firebaseConfigLocal } from './firebase.config.local';

export type { FirebaseClientConfig } from './firebase-config.types';
export { emptyFirebaseConfig } from './firebase-config.types';

/** Config Firebase active (fichier local gitignored, vide par défaut). */
export const firebaseConfig = firebaseConfigLocal;
