import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom, Observable } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { FirebaseAuthService } from '../../shared/services/firebase-auth.service';
import {
  AuthStep,
  CustomerLoginResponse,
} from '../../shared/models/customer-auth.model';
import { environment } from '../../../environments/environment';
import { toUsername } from '../../shared/utils/phone-normalizer';

/** Page Connexion — wizard téléphone → PIN ou OTP+PIN. */
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements ViewWillEnter {
  step: AuthStep = 'phone';
  phone = '';
  maskedName = '';
  firebaseIdToken = '';
  isLoading = false;
  error = '';
  appVersion = environment.version;

  phoneForm: FormGroup;
  pinForm: FormGroup;
  otpForm: FormGroup;
  setupPinForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: CustomerApiService,
    private session: CustomerSessionService,
    private firebaseAuth: FirebaseAuthService,
    private router: Router,
  ) {
    this.phoneForm = this.fb.group({
      phone: ['', [Validators.required, Validators.minLength(8)]],
    });
    this.pinForm = this.fb.group({
      pin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
    });
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6)]],
    });
    this.setupPinForm = this.fb.group({
      pin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
      confirmPin: ['', [Validators.required]],
    }, { validators: this.pinMatchValidator });
  }

  ionViewWillEnter(): void {
    if (!this.session.isAuthenticated) {
      this.resetWizard();
    }
  }

  private resetWizard(): void {
    this.step = 'phone';
    this.phone = '';
    this.maskedName = '';
    this.firebaseIdToken = '';
    this.error = '';
    this.isLoading = false;
    this.phoneForm.reset();
    this.pinForm.reset();
    this.otpForm.reset();
    this.setupPinForm.reset();
  }

  private pinMatchValidator(group: FormGroup) {
    const pin = group.get('pin')?.value;
    const confirm = group.get('confirmPin')?.value;
    return pin === confirm ? null : { pinMismatch: true };
  }

  get title(): string {
    switch (this.step) {
      case 'phone': return 'Connexion';
      case 'pin': return 'Code PIN';
      case 'otp': return 'Vérification SMS';
      case 'setup-pin': return 'Créer votre PIN';
      default: return 'Connexion';
    }
  }

  get subtitle(): string {
    switch (this.step) {
      case 'phone': return 'Entrez votre numéro de téléphone';
      case 'pin': return this.maskedName ? `Bonjour ${this.maskedName}` : 'Saisissez votre code PIN';
      case 'otp': return 'Un code a été envoyé par SMS';
      case 'setup-pin': return 'Choisissez un code PIN à 4-6 chiffres';
      default: return '';
    }
  }

  async submitPhone(): Promise<void> {
    if (this.phoneForm.invalid) return;
    this.isLoading = true;
    this.error = '';
    try {
      this.phone = toUsername(this.phoneForm.value.phone);
      const res = await firstValueFrom(this.api.checkPhone({ phone: this.phone }));
      if (!res.exists) {
        this.error = 'Numéro non reconnu. Contactez votre agence.';
        return;
      }
      this.maskedName = res.maskedName ?? '';
      if (res.pinConfigured) {
        this.step = 'pin';
      } else {
        await this.startOtp();
      }
    } catch (e: unknown) {
      this.error = this.extractError(e);
    } finally {
      this.isLoading = false;
    }
  }

  async submitPin(): Promise<void> {
    if (this.pinForm.invalid) return;
    await this.completeLogin(this.api.login({ phone: this.phone, pin: this.pinForm.value.pin }));
  }

  private async startOtp(): Promise<void> {
    if (!this.firebaseAuth.isConfigured()) {
      this.error = 'Vérification SMS non configurée. Contactez le support.';
      return;
    }
    try {
      await this.firebaseAuth.sendOtp(this.phone);
      this.step = 'otp';
    } catch (e: unknown) {
      console.error('[Auth] Échec envoi OTP Firebase', e);
      this.error = this.formatOtpSendError(e);
    }
  }

  private formatOtpSendError(e: unknown): string {
    const code = this.firebaseErrorCode(e);
    if (code === 'auth/invalid-app-credential' || code === 'auth/app-not-authorized') {
      return 'Configuration Firebase incorrecte (app Web requise pour le navigateur).';
    }
    if (code === 'auth/configuration-not-found') {
      return 'Firebase Auth non activé : activez « Téléphone » dans la console Firebase (Authentication → Sign-in method) et autorisez la région +228.';
    }
    if (code === 'auth/invalid-phone-number') {
      return 'Numéro de téléphone invalide.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Trop de tentatives. Réessayez plus tard.';
    }
    if (code === 'auth/captcha-check-failed' || code === 'auth/missing-recaptcha-token') {
      return 'Vérification anti-robot échouée. Rechargez la page et réessayez.';
    }
    if (!environment.production && e instanceof Error && e.message) {
      return `Impossible d'envoyer le SMS : ${e.message}`;
    }
    return 'Impossible d\'envoyer le SMS.';
  }

  private firebaseErrorCode(e: unknown): string | undefined {
    if (e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
      return (e as { code: string }).code;
    }
    return undefined;
  }

  async submitOtp(): Promise<void> {
    if (this.otpForm.invalid) return;
    this.isLoading = true;
    this.error = '';
    try {
      this.firebaseIdToken = await this.firebaseAuth.verifyOtp(this.otpForm.value.otp);
      this.step = 'setup-pin';
    } catch {
      this.error = 'Code incorrect. Réessayez.';
    } finally {
      this.isLoading = false;
    }
  }

  async submitSetupPin(): Promise<void> {
    if (this.setupPinForm.invalid) return;
    if (this.setupPinForm.hasError('pinMismatch')) {
      this.error = 'Les codes PIN ne correspondent pas.';
      return;
    }
    await this.completeLogin(this.api.setupPin({
      phone: this.phone,
      pin: this.setupPinForm.value.pin,
      firebaseIdToken: this.firebaseIdToken,
    }));
  }

  private async completeLogin(request: Observable<CustomerLoginResponse>): Promise<void> {
    this.isLoading = true;
    this.error = '';
    try {
      const res = await firstValueFrom(request);
      this.session.saveSession({ ...res, isAuthenticated: true });
      await this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      this.error = this.extractError(e);
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.error = '';
    if (this.step === 'pin' || this.step === 'otp') {
      this.step = 'phone';
    } else if (this.step === 'setup-pin') {
      this.step = 'otp';
    }
  }

  private extractError(e: unknown): string {
    if (e && typeof e === 'object' && 'error' in e) {
      const err = (e as { error?: { message?: string } }).error;
      if (err?.message) return err.message;
    }
    if (e instanceof Error) return e.message;
    return 'Une erreur est survenue.';
  }
}
