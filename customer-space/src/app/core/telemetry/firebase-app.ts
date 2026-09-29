import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

/**
 * Instance Firebase partagée (Remote Config, Analytics web).
 * Ne lance pas d'erreur si la config est absente (E2E / builds sans secrets).
 */
export function getSharedFirebaseApp(): FirebaseApp | null {
  if (getApps().length > 0) {
    return getApp();
  }
  if (!environment.firebase?.apiKey) {
    return null;
  }
  return initializeApp(environment.firebase);
}
