import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom, Observable } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import {
  AuthStep,
  CustomerLoginResponse,
  CustomerLocality,
} from '../../shared/models/customer-auth.model';
import { environment } from '../../../environments/environment';
import { toUsername } from '../../shared/utils/phone-normalizer';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';
import { APP_UNAVAILABLE_MESSAGE } from '../../shared/constants/app-availability';
import { isE2eMode } from '../../shared/utils/e2e';
import {
  adultDateOfBirthValidator,
  underageErrorMessage,
} from '../../shared/utils/adult-dob.validator';
import { captureRegistrationLocation } from '../../shared/utils/registration-location';
import {
  pickProfilPhotoWithFaceValidation,
  shouldUseHtmlFilePickerForPhoto,
} from '../../shared/utils/profil-photo-face';

/** Page Connexion / Inscription — wizard téléphone → PIN, OTP ou inscription. */
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
  otpProofToken = '';
  profilPhotoDataUrl = '';
  isLoading = false;
  error = '';
  appUnavailable = false;
  readonly appUnavailableMessage = APP_UNAVAILABLE_MESSAGE;
  appVersion = environment.version;
  isRegistrationFlow = false;
  localities: CustomerLocality[] = [];
  localitiesLoading = false;

  phoneForm: FormGroup;
  pinForm: FormGroup;
  otpForm: FormGroup;
  setupPinForm: FormGroup;
  registerForm: FormGroup;
  registerPinForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: CustomerApiService,
    private session: CustomerSessionService,
    private featureFlags: FeatureFlagService,
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
    this.registerForm = this.fb.group({
      firstname: ['', [Validators.required, Validators.maxLength(100)]],
      lastname: ['', [Validators.required, Validators.maxLength(100)]],
      address: ['', [Validators.required, Validators.maxLength(255)]],
      quarter: ['', [Validators.required, Validators.maxLength(100)]],
      dateOfBirth: ['', [Validators.required, adultDateOfBirthValidator()]],
      occupation: ['', [Validators.required, Validators.maxLength(100)]],
    });
    this.registerPinForm = this.fb.group({
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
    this.otpProofToken = '';
    this.profilPhotoDataUrl = '';
    this.error = '';
    this.appUnavailable = false;
    this.isLoading = false;
    this.isRegistrationFlow = false;
    this.localities = [];
    this.localitiesLoading = false;
    this.phoneForm.reset();
    this.pinForm.reset();
    this.otpForm.reset();
    this.setupPinForm.reset();
    this.registerForm.reset();
    this.registerPinForm.reset();
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
      case 'otp':
      case 'register-otp': return 'Vérification SMS';
      case 'setup-pin': return 'Créer votre PIN';
      case 'register-form': return 'Inscription';
      case 'register-pin': return 'Créer votre PIN';
      default: return 'Connexion';
    }
  }

  get subtitle(): string {
    switch (this.step) {
      case 'phone': return 'Entrez votre numéro de téléphone';
      case 'pin': return this.maskedName ? `Bonjour ${this.maskedName}` : 'Saisissez votre code PIN';
      case 'otp':
      case 'register-otp': return 'Un code a été envoyé par SMS';
      case 'setup-pin': return 'Choisissez un code PIN à 4-6 chiffres';
      case 'register-form': return 'Renseignez vos informations et votre photo';
      case 'register-pin': return 'Choisissez un code PIN à 4-6 chiffres';
      default: return '';
    }
  }

  get dateOfBirthError(): string {
    const control = this.registerForm.get('dateOfBirth');
    if (!control || !(control.touched || control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'La date de naissance est obligatoire.';
    }
    if (control.hasError('underage')) {
      return underageErrorMessage();
    }
    if (control.hasError('invalidDate')) {
      return 'Date de naissance invalide.';
    }
    return '';
  }

  onDateOfBirthChanged(): void {
    const control = this.registerForm.get('dateOfBirth');
    control?.markAsTouched();
    control?.updateValueAndValidity({ emitEvent: false });
  }

  async submitPhone(): Promise<void> {
    if (this.phoneForm.invalid) return;
    this.isLoading = true;
    this.error = '';
    this.appUnavailable = false;
    try {
      await this.featureFlags.refresh();
      if (!this.featureFlags.isCustomerSpaceAvailable()) {
        this.appUnavailable = true;
        return;
      }

      this.phone = toUsername(this.phoneForm.value.phone);
      const res = await firstValueFrom(this.api.checkPhone({ phone: this.phone }));
      if (!res.exists) {
        if (res.canRegister) {
          this.isRegistrationFlow = true;
          await this.startOtp('register-otp');
          return;
        }
        this.error = 'Numéro non reconnu. Contactez votre agence.';
        return;
      }
      this.isRegistrationFlow = false;
      this.maskedName = res.maskedName ?? '';
      if (res.pinConfigured) {
        this.step = 'pin';
      } else {
        await this.startOtp('otp');
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

  private async startOtp(nextStep: 'otp' | 'register-otp'): Promise<void> {
    try {
      if (isE2eMode()) {
        console.info('[E2E] OTP mock pour', this.phone, '→ saisir 123456 (bypass window.__E2E__)');
        this.step = nextStep;
        return;
      }
      await firstValueFrom(this.api.sendOtp({ phone: this.phone }));
      this.step = nextStep;
    } catch (e: unknown) {
      console.error('[Auth] Échec envoi OTP Notification Hub', e);
      this.error = this.extractError(e) || 'Impossible d\'envoyer le SMS.';
    }
  }

  async submitOtp(): Promise<void> {
    if (this.otpForm.invalid) return;
    this.isLoading = true;
    this.error = '';
    try {
      if (isE2eMode()) {
        console.info('[E2E] verify OTP court-circuité — preuve mock (code saisi:', this.otpForm.value.otp, ')');
        this.otpProofToken = 'e2e-mock-otp-proof';
        if (this.isRegistrationFlow) {
          await this.goToRegisterForm();
        } else {
          this.step = 'setup-pin';
        }
        return;
      }
      const res = await firstValueFrom(this.api.verifyOtp({
        phone: this.phone,
        code: this.otpForm.value.otp,
      }));
      this.otpProofToken = res.otpProofToken;
      if (this.isRegistrationFlow) {
        await this.goToRegisterForm();
      } else {
        this.step = 'setup-pin';
      }
    } catch (e: unknown) {
      this.error = this.extractError(e) || 'Code incorrect. Réessayez.';
    } finally {
      this.isLoading = false;
    }
  }

  private async goToRegisterForm(): Promise<void> {
    this.step = 'register-form';
    await this.loadLocalities();
  }

  private async loadLocalities(): Promise<void> {
    this.localitiesLoading = true;
    try {
      this.localities = await firstValueFrom(this.api.listLocalities());
    } catch (e: unknown) {
      this.localities = [];
      this.error = this.extractError(e) || 'Impossible de charger les zones.';
    } finally {
      this.localitiesLoading = false;
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
      otpProofToken: this.otpProofToken,
    }));
  }

  async onProfilPhotoClick(fileInput: HTMLInputElement): Promise<void> {
    this.error = '';
    if (shouldUseHtmlFilePickerForPhoto()) {
      fileInput.click();
      return;
    }
    this.isLoading = true;
    try {
      const result = await pickProfilPhotoWithFaceValidation();
      this.profilPhotoDataUrl = result.dataUrl;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('annul')) {
        return;
      }
      this.error = message || 'Impossible de prendre une photo.';
      this.profilPhotoDataUrl = '';
    } finally {
      this.isLoading = false;
    }
  }

  onProfilPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error = 'Veuillez sélectionner une image.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.profilPhotoDataUrl = typeof reader.result === 'string' ? reader.result : '';
      this.error = '';
    };
    reader.readAsDataURL(file);
  }

  submitRegisterForm(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) {
      if (this.registerForm.get('dateOfBirth')?.hasError('underage')) {
        this.error = underageErrorMessage();
      }
      return;
    }
    if (!this.profilPhotoDataUrl) {
      this.error = 'La photo de profil est obligatoire.';
      return;
    }
    this.error = '';
    this.step = 'register-pin';
  }

  async submitRegisterPin(): Promise<void> {
    if (this.registerPinForm.invalid) return;
    if (this.registerPinForm.hasError('pinMismatch')) {
      this.error = 'Les codes PIN ne correspondent pas.';
      return;
    }
    if (!this.profilPhotoDataUrl) {
      this.error = 'La photo de profil est obligatoire.';
      return;
    }
    const form = this.registerForm.value;
    this.isLoading = true;
    this.error = '';
    let location;
    try {
      location = await captureRegistrationLocation();
    } catch (e: unknown) {
      this.error = e instanceof Error
        ? e.message
        : "Impossible d'obtenir la localisation. Activez le GPS et réessayez.";
      this.isLoading = false;
      return;
    }
    await this.completeLogin(this.api.register({
      phone: this.phone,
      otpProofToken: this.otpProofToken,
      firstname: form.firstname,
      lastname: form.lastname,
      address: form.address,
      quarter: form.quarter,
      dateOfBirth: form.dateOfBirth,
      occupation: form.occupation,
      profilPhoto: this.profilPhotoDataUrl,
      pin: this.registerPinForm.value.pin,
      latitude: location.latitude,
      longitude: location.longitude,
      mll: location.mll,
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
    this.appUnavailable = false;
    if (this.step === 'pin' || this.step === 'otp' || this.step === 'register-otp') {
      this.step = 'phone';
      this.isRegistrationFlow = false;
    } else if (this.step === 'setup-pin') {
      this.step = 'otp';
    } else if (this.step === 'register-form') {
      this.step = 'register-otp';
    } else if (this.step === 'register-pin') {
      this.step = 'register-form';
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
