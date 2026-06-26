import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { toE164 } from '../utils/phone-normalizer';
import { isE2eMode } from '../utils/e2e';

/**
 * Firebase Phone Auth pour la configuration initiale du PIN.
 * Nécessite une config Firebase valide dans environment.firebase.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private confirmation: ConfirmationResult | null = null;
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  isConfigured(): boolean {
    if (isE2eMode()) return true;
    return !!environment.firebase?.apiKey;
  }

  private ensureInit(): Auth {
    if (!this.isConfigured()) {
      throw new Error('Firebase non configuré. Définissez environment.firebase.');
    }
    if (!this.auth) {
      this.app = initializeApp(environment.firebase!);
      this.auth = getAuth(this.app);
    }
    return this.auth;
  }

  async sendOtp(localPhone: string, containerId = 'recaptcha-container'): Promise<void> {
    if (isE2eMode()) return;
    const auth = this.ensureInit();
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
    }
    this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    const e164 = toE164(localPhone);
    this.confirmation = await signInWithPhoneNumber(auth, e164, this.recaptchaVerifier);
  }

  async verifyOtp(code: string): Promise<string> {
    if (isE2eMode()) return 'e2e-mock-firebase-token';
    if (!this.confirmation) {
      throw new Error('Aucun OTP en cours. Demandez un nouveau code.');
    }
    const cred = await this.confirmation.confirm(code);
    return cred.user.getIdToken();
  }

  /** Fallback si confirmationResult déjà consommé via credential manuelle */
  async verifyWithCredential(localPhone: string, verificationId: string, code: string): Promise<string> {
    const auth = this.ensureInit();
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const result = await signInWithCredential(auth, credential);
    return result.user.getIdToken();
  }
}
