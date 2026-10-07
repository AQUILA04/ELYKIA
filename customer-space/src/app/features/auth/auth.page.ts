import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom, Observable } from 'rxjs';
import { UserJournalService } from '../../core/telemetry/user-journal.service';
import { TelemetryContextService } from '../../core/telemetry/telemetry-context.service';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import {
  AuthStep,
  CustomerLoginResponse,
  CustomerLocality,
} from '../../shared/models/customer-auth.model';
import { environment } from '../../../environments/environment';
import { INVALID_TOGO_PHONE_MESSAGE, toUsername } from '../../shared/utils/phone-normalizer';
import { togoMobilePhoneValidator } from '../../shared/utils/togo-phone.validator';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';
import { APP_UNAVAILABLE_MESSAGE } from '../../shared/constants/app-availability';
import { isE2eMode } from '../../shared/utils/e2e';
import { DEFAULT_POST_LOGIN_URL, readReturnUrlFromLocation } from '../../shared/utils/return-url';
import {
  ElykDecorHeaderComponent,
  ElykLocalityPickerComponent,
  ElykOverlapCardComponent,
  ElykOutlinedFieldComponent,
  LegalLinksComponent,
} from '../../shared/ui';
import { LayoutService } from '../../shared/layout/layout.service';
import { AuthDesktopComponent } from './desktop/auth-desktop.component';
import { AuthRegisterConsentComponent } from './auth-register-consent.component';

/** Délai avant un nouveau renvoi OTP — aligné sur le cooldown hub (60 s). */
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const E2E_OTP_REFERENCE = 'E2E1';
const PHONE_HINT =
  "Pas encore de compte ? Saisissez simplement votre numéro de téléphone et laissez-vous guider.";
import {
  adultDateOfBirthValidator,
  underageErrorMessage,
} from '../../shared/utils/adult-dob.validator';
import { captureRegistrationLocation } from '../../shared/utils/registration-location';
import { DeviceAccessPromptService } from '../../shared/services/device-access-prompt.service';
import { isReturningVisitor } from '../../shared/utils/prior-visit';
import { REGISTER_CONSENT_LEAD } from './customer-terms';
import {
  pickProfilPhotoWithFaceValidation,
  shouldUseHtmlFilePickerForPhoto,
} from '../../shared/utils/profil-photo-face';

/** Page Connexion / Inscription — wizard téléphone → PIN, OTP ou inscription. */
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    ElykDecorHeaderComponent,
    ElykOverlapCardComponent,
    ElykOutlinedFieldComponent,
    ElykLocalityPickerComponent,
    AuthDesktopComponent,
    AuthRegisterConsentComponent,
    LegalLinksComponent,
  ],
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements ViewWillEnter, OnDestroy {
  readonly layout = inject(LayoutService);
  private readonly journal = inject(UserJournalService);
  private readonly telemetryCtx = inject(TelemetryContextService);
  private readonly deviceAccess = inject(DeviceAccessPromptService);
  step: AuthStep = 'phone';
  phone = '';
  maskedName = '';
  otpProofToken = '';
  otpReference = '';
  resendCountdown = 0;
  profilPhotoDataUrl = '';
  isLoading = false;
  error = '';
  appUnavailable = false;
  readonly appUnavailableMessage = APP_UNAVAILABLE_MESSAGE;
  readonly phoneHint = PHONE_HINT;
  readonly consentLead = REGISTER_CONSENT_LEAD;
  termsAccepted = false;
  termsOpen = false;
  appVersion = environment.version;
  isRegistrationFlow = false;
  localities: CustomerLocality[] = [];
  localitiesLoading = false;
  localitiesError = '';

  phoneForm: FormGroup;
  pinForm: FormGroup;
  otpForm: FormGroup;
  setupPinForm: FormGroup;
  registerForm: FormGroup;
  registerPinForm: FormGroup;

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private fb: FormBuilder,
    private api: CustomerApiService,
    private session: CustomerSessionService,
    private featureFlags: FeatureFlagService,
    private router: Router,
  ) {
    this.phoneForm = this.fb.group({
      phone: ['', [Validators.required, togoMobilePhoneValidator()]],
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

  ngOnDestroy(): void {
    this.clearResendTimer();
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
    this.otpReference = '';
    this.profilPhotoDataUrl = '';
    this.error = '';
    this.appUnavailable = false;
    this.isLoading = false;
    this.isRegistrationFlow = false;
    this.termsAccepted = false;
    this.termsOpen = false;
    this.localities = [];
    this.localitiesLoading = false;
    this.localitiesError = '';
    this.clearResendTimer();
    this.resendCountdown = 0;
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

  /** Titre émotionnel dans la carte (Playfair). */
  get title(): string {
    switch (this.step) {
      case 'phone': return isReturningVisitor() ? 'Bon retour !' : 'Bienvenue';
      case 'pin': return 'Code PIN';
      case 'otp':
      case 'register-otp': return 'Vérification SMS';
      case 'setup-pin': return 'Créer votre PIN';
      case 'register-consent': return 'Pas encore client';
      case 'register-form': return 'Bienvenue';
      case 'register-pin': return 'Créer votre PIN';
      default: return 'Bon retour !';
    }
  }

  get subtitle(): string {
    switch (this.step) {
      case 'phone': return 'Connectez-vous à votre espace';
      case 'register-consent': return this.consentLead;
      case 'pin': return this.maskedName ? `Bonjour ${this.maskedName}` : 'Saisissez votre code PIN';
      case 'otp':
      case 'register-otp':
        return this.otpReference
          ? `Saisissez le code à 6 chiffres reçu par SMS associé à la référence ${this.otpReference}`
          : 'Un code a été envoyé par SMS';
      case 'setup-pin': return 'Choisissez un code PIN à 4-6 chiffres';
      case 'register-form': return 'Renseignez vos informations et votre photo';
      case 'register-pin': return 'Choisissez un code PIN à 4-6 chiffres';
      default: return '';
    }
  }

  get canResendOtp(): boolean {
    return this.resendCountdown <= 0 && !this.isLoading;
  }

  get resendLabel(): string {
    if (this.resendCountdown > 0) {
      return `Renvoyer le code (${this.resendCountdown} s)`;
    }
    return 'Renvoyer le code';
  }

  get phoneError(): string {
    const control = this.phoneForm.get('phone');
    if (!control || !(control.touched || control.dirty)) {
      return '';
    }
    return control.hasError('togoPhone') ? INVALID_TOGO_PHONE_MESSAGE : '';
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
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.error = '';
    this.appUnavailable = false;
    try {
      await this.featureFlags.refresh();
      if (!this.featureFlags.isCustomerSpaceAvailable()) {
        this.appUnavailable = true;
        this.journal.track('CUSTOMER_SPACE_UNAVAILABLE', 'AUTH');
        return;
      }

      this.phone = toUsername(this.phoneForm.value.phone);
      this.telemetryCtx.setClient(null, this.phone);
      this.journal.track('PHONE_SUBMITTED', 'AUTH');
      const res = await firstValueFrom(this.api.checkPhone({ phone: this.phone }));
      if (!res.exists) {
        if (res.canRegister) {
          this.isRegistrationFlow = true;
          this.termsAccepted = false;
          this.termsOpen = false;
          this.step = 'register-consent';
          return;
        }
        this.error = 'Numéro non reconnu. Contactez votre agence.';
        this.journal.track('LOGIN_FAILED', 'AUTH', { reason: 'phone_not_recognized' });
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
      this.journal.track('LOGIN_FAILED', 'AUTH', { reason: this.error });
    } finally {
      this.isLoading = false;
    }
  }

  async submitPin(): Promise<void> {
    if (this.pinForm.invalid) return;
    this.journal.track('PIN_LOGIN_ATTEMPT', 'AUTH');
    await this.completeLogin(this.api.login({ phone: this.phone, pin: this.pinForm.value.pin }));
  }

  setTermsAccepted(checked: boolean): void {
    this.termsAccepted = checked;
    if (checked) {
      this.error = '';
    }
  }

  toggleTerms(): void {
    this.termsOpen = !this.termsOpen;
  }

  /** Envoie le SMS d'inscription seulement après acceptation des conditions. */
  async continueRegistration(): Promise<void> {
    if (this.step !== 'register-consent') {
      return;
    }
    if (!this.termsAccepted) {
      this.error = "Cochez la case pour accepter les conditions d'utilisation.";
      return;
    }
    this.isLoading = true;
    this.error = '';
    try {
      await this.startOtp('register-otp');
    } finally {
      this.isLoading = false;
    }
  }

  private async startOtp(nextStep: 'otp' | 'register-otp'): Promise<void> {
    const startedFrom = this.step;
    this.journal.track('OTP_SEND_REQUESTED', 'AUTH', { flow: nextStep });
    try {
      if (isE2eMode()) {
        console.info('[E2E] OTP mock pour', this.phone, '→ saisir 123456 (bypass window.__E2E__)');
        if (this.step !== startedFrom) {
          return;
        }
        this.otpReference = E2E_OTP_REFERENCE;
        this.step = nextStep;
        this.startResendCooldown();
        this.journal.track('OTP_SENT', 'AUTH', { flow: nextStep, mock: true, reference: this.otpReference });
        return;
      }
      const res = await firstValueFrom(this.api.sendOtp({ phone: this.phone }));
      if (this.step !== startedFrom) {
        return;
      }
      this.otpReference = res.reference?.trim() || '';
      this.step = nextStep;
      this.startResendCooldown();
      this.journal.track('OTP_SENT', 'AUTH', { flow: nextStep, reference: this.otpReference });
    } catch (e: unknown) {
      if (this.step !== startedFrom) {
        return;
      }
      console.error('[Auth] Échec envoi OTP Notification Hub', e);
      this.error = this.extractError(e) || 'Impossible d\'envoyer le SMS.';
      this.journal.track('OTP_FAILED', 'AUTH', { stage: 'send', reason: this.error });
    }
  }

  async resendOtp(): Promise<void> {
    if (!this.canResendOtp) return;
    if (this.step !== 'otp' && this.step !== 'register-otp') return;
    this.isLoading = true;
    this.error = '';
    this.journal.track('OTP_SEND_REQUESTED', 'AUTH', { resend: true });
    try {
      if (isE2eMode()) {
        this.otpReference = E2E_OTP_REFERENCE;
        this.otpForm.reset();
        this.error = `Nouveau code envoyé. Seul le code de référence ${this.otpReference} est valide.`;
        this.startResendCooldown();
        this.journal.track('OTP_SENT', 'AUTH', { resend: true, mock: true, reference: this.otpReference });
        return;
      }
      const res = await firstValueFrom(this.api.sendOtp({ phone: this.phone }));
      this.otpReference = res.reference?.trim() || '';
      this.otpForm.reset();
      this.error = this.otpReference
        ? `Nouveau code envoyé. Seul le code de référence ${this.otpReference} est valide.`
        : 'Nouveau code envoyé.';
      this.startResendCooldown();
      this.journal.track('OTP_SENT', 'AUTH', { resend: true, reference: this.otpReference });
    } catch (e: unknown) {
      this.error = this.extractError(e) || 'Impossible de renvoyer le SMS.';
      this.journal.track('OTP_FAILED', 'AUTH', { stage: 'resend', reason: this.error });
    } finally {
      this.isLoading = false;
    }
  }

  private startResendCooldown(): void {
    this.clearResendTimer();
    this.resendCountdown = OTP_RESEND_COOLDOWN_SECONDS;
    this.resendTimer = setInterval(() => {
      this.resendCountdown -= 1;
      if (this.resendCountdown <= 0) {
        this.clearResendTimer();
        this.resendCountdown = 0;
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  async submitOtp(): Promise<void> {
    if (this.otpForm.invalid) return;
    this.isLoading = true;
    this.error = '';
    this.journal.track('OTP_VERIFY_ATTEMPT', 'AUTH');
    try {
      if (isE2eMode()) {
        console.info('[E2E] verify OTP court-circuité — preuve mock (code saisi:', this.otpForm.value.otp, ')');
        this.otpProofToken = 'e2e-mock-otp-proof';
        this.step = this.isRegistrationFlow ? 'register-form' : 'setup-pin';
        if (this.isRegistrationFlow) {
          await this.loadLocalities();
        }
        this.journal.track('OTP_VERIFIED', 'AUTH', { mock: true });
        return;
      }
      const res = await firstValueFrom(this.api.verifyOtp({
        phone: this.phone,
        code: this.otpForm.value.otp,
      }));
      this.otpProofToken = res.otpProofToken;
      this.step = this.isRegistrationFlow ? 'register-form' : 'setup-pin';
      if (this.isRegistrationFlow) {
        await this.loadLocalities();
      }
      this.journal.track('OTP_VERIFIED', 'AUTH');
    } catch (e: unknown) {
      this.error = this.extractError(e) || 'Code incorrect. Réessayez.';
      this.journal.track('OTP_FAILED', 'AUTH', { stage: 'verify', reason: this.error });
    } finally {
      this.isLoading = false;
    }
  }

  async loadLocalities(): Promise<void> {
    this.localitiesLoading = true;
    this.localitiesError = '';
    try {
      this.localities = await firstValueFrom(this.api.getLocalities());
    } catch (e: unknown) {
      this.localities = [];
      this.localitiesError = this.extractError(e) || 'Impossible de charger les zones.';
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
    this.journal.track('PIN_SETUP', 'AUTH');
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
      const result = await pickProfilPhotoWithFaceValidation(this.deviceAccess);
      this.profilPhotoDataUrl = result.dataUrl;
    } catch (e: unknown) {
      if (await this.deviceAccess.presentIfNeeded(e)) {
        return;
      }
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
    this.journal.track('REGISTER_SUBMITTED', 'AUTH');
    this.isLoading = true;
    this.error = '';
    let location;
    try {
      location = await captureRegistrationLocation(this.deviceAccess);
    } catch (e: unknown) {
      if (!(await this.deviceAccess.presentIfNeeded(e))) {
        this.error = e instanceof Error
          ? e.message
          : "Impossible d'obtenir la localisation. Activez le GPS et réessayez.";
      }
      this.isLoading = false;
      this.journal.track('LOGIN_FAILED', 'AUTH', { reason: 'location_unavailable' });
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
      await this.router.navigateByUrl(readReturnUrlFromLocation() ?? DEFAULT_POST_LOGIN_URL);
    } catch (e: unknown) {
      this.error = this.extractError(e);
      this.journal.track('LOGIN_FAILED', 'AUTH', { reason: this.error });
    } finally {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.error = '';
    this.appUnavailable = false;
    if (this.step === 'pin' || this.step === 'otp' || this.step === 'register-otp' || this.step === 'register-consent') {
      this.step = 'phone';
      this.isRegistrationFlow = false;
      this.termsAccepted = false;
      this.termsOpen = false;
      this.otpReference = '';
      this.clearResendTimer();
      this.resendCountdown = 0;
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
