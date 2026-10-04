import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { AuthPage } from './auth.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';
import { LayoutService } from '../../shared/layout/layout.service';
import { UserJournalService } from '../../core/telemetry/user-journal.service';
import { APP_UNAVAILABLE_MESSAGE } from '../../shared/constants/app-availability';
import { INVALID_TOGO_PHONE_MESSAGE } from '../../shared/utils/phone-normalizer';
import { IonicModule } from '@ionic/angular';

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  let api: jasmine.SpyObj<CustomerApiService>;
  let router: jasmine.SpyObj<Router>;
  let featureFlags: jasmine.SpyObj<FeatureFlagService>;
  let session: CustomerSessionService;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    api = jasmine.createSpyObj('CustomerApiService', [
      'checkPhone', 'login', 'setupPin', 'sendOtp', 'verifyOtp', 'register', 'getLocalities',
    ]);
    api.checkPhone.and.returnValue(of({ exists: true, pinConfigured: true, maskedName: 'Jean' }));
    api.login.and.returnValue(of({
      token: 't',
      clientId: '1',
      fullName: 'Jean',
      phone: '90123456',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));
    api.sendOtp.and.returnValue(of({ channel: 'SMS', reference: 'Y4GP' }));
    api.verifyOtp.and.returnValue(of({ verified: true, otpProofToken: 'proof-token' }));
    api.getLocalities.and.returnValue(of([{ id: 1, name: 'Tokoin' }, { id: 2, name: 'Agoè' }]));

    router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], {
      events: EMPTY,
      url: '/',
    });
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));

    featureFlags = jasmine.createSpyObj('FeatureFlagService', ['refresh', 'isCustomerSpaceAvailable']);
    featureFlags.refresh.and.returnValue(Promise.resolve());
    featureFlags.isCustomerSpaceAvailable.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [AuthPage, ReactiveFormsModule, IonicModule.forRoot()],
      providers: [
        { provide: CustomerApiService, useValue: api },
        CustomerSessionService,
        { provide: FeatureFlagService, useValue: featureFlags },
        { provide: Router, useValue: router },
        // Force mobile template so Type A decor assertions stay deterministic in wide CI viewports.
        { provide: LayoutService, useValue: { isDesktop: () => false, refresh: () => undefined } },
        {
          provide: UserJournalService,
          useValue: jasmine.createSpyObj('UserJournalService', [
            'track', 'bindUser', 'unbindUser', 'flush', 'init',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthPage);
    session = TestBed.inject(CustomerSessionService);
    session.clearSession();
  });

  it('starts on phone step', () => {
    expect(fixture.componentInstance.step).toBe('phone');
  });

  it('renders Type A decor header branding and welcome copy on phone step', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-elyk-decor-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-elyk-overlap-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-elyk-outlined-field')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('AMENOUVEVE-YAVEH');
    expect(fixture.nativeElement.textContent).toContain('Elykia');
    expect(fixture.nativeElement.textContent).toContain('Espace Client');
    expect(fixture.nativeElement.textContent).toContain('Bienvenue');
    expect(fixture.nativeElement.textContent).toContain('Connectez-vous à votre espace');
  });

  it('shows Bon retour when the app was already opened on this device', () => {
    sessionStorage.setItem('elykia_customer_prior_visit', '1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bon retour !');
  });

  it('displays app version', () => {
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('[data-testid="e2e-auth-version"]');
    expect(footer?.textContent).toContain(fixture.componentInstance.appVersion);
  });

  it('moves to pin step when phone is recognized', async () => {
    fixture.componentInstance.phoneForm.patchValue({ phone: '90123456' });
    await fixture.componentInstance.submitPhone();
    expect(featureFlags.refresh).toHaveBeenCalled();
    expect(fixture.componentInstance.step).toBe('pin');
  });

  it('rejects a non-Togolese phone number without calling the backend', async () => {
    const control = fixture.componentInstance.phoneForm.get('phone')!;
    control.setValue('94123456');

    expect(fixture.componentInstance.phoneForm.invalid).toBeTrue();
    await fixture.componentInstance.submitPhone();

    expect(api.checkPhone).not.toHaveBeenCalled();
    expect(fixture.componentInstance.phoneError).toBe(INVALID_TOGO_PHONE_MESSAGE);
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[data-testid="e2e-auth-phone-error"]');
    expect(error?.textContent).toContain(INVALID_TOGO_PHONE_MESSAGE);
  });

  it('accepts a Togolese phone number with country code', () => {
    fixture.componentInstance.phoneForm.patchValue({ phone: '+228 70 15 51 69' });
    expect(fixture.componentInstance.phoneForm.valid).toBeTrue();
    expect(fixture.componentInstance.phoneError).toBe('');
  });

  it('shows unavailable message when feature flag is disabled', async () => {
    featureFlags.isCustomerSpaceAvailable.and.returnValue(false);
    fixture.componentInstance.phoneForm.patchValue({ phone: '90123456' });
    await fixture.componentInstance.submitPhone();

    expect(api.checkPhone).not.toHaveBeenCalled();
    expect(fixture.componentInstance.appUnavailable).toBeTrue();
    expect(fixture.componentInstance.appUnavailableMessage).toBe(APP_UNAVAILABLE_MESSAGE);
    expect(fixture.componentInstance.step).toBe('phone');
  });

  it('starts OTP via backend when phone exists without PIN', async () => {
    api.checkPhone.and.returnValue(of({ exists: true, pinConfigured: false, maskedName: 'Jean' }));

    fixture.detectChanges();
    fixture.componentInstance.phoneForm.patchValue({ phone: '90123456' });
    await fixture.componentInstance.submitPhone();

    expect(api.sendOtp).toHaveBeenCalledWith({ phone: '90123456' });
    expect(fixture.componentInstance.step).toBe('otp');
    expect(fixture.componentInstance.otpReference).toBe('Y4GP');
    expect(fixture.componentInstance.resendCountdown).toBeGreaterThan(0);
  });

  it('shows error when OTP send fails', async () => {
    api.checkPhone.and.returnValue(of({ exists: true, pinConfigured: false, maskedName: 'Jean' }));
    api.sendOtp.and.returnValue(throwError(() => ({ error: { message: 'Numéro de téléphone invalide.' } })));

    fixture.detectChanges();
    fixture.componentInstance.phoneForm.patchValue({ phone: '90123456' });
    await fixture.componentInstance.submitPhone();

    expect(fixture.componentInstance.error).toBe('Numéro de téléphone invalide.');
    expect(fixture.componentInstance.step).toBe('phone');
  });

  it('resends OTP when cooldown elapsed', async () => {
    fixture.componentInstance.phone = '90123456';
    fixture.componentInstance.step = 'otp';
    fixture.componentInstance.resendCountdown = 0;
    api.sendOtp.and.returnValue(of({ channel: 'SMS', reference: 'K9MT' }));

    await fixture.componentInstance.resendOtp();

    expect(api.sendOtp).toHaveBeenCalledWith({ phone: '90123456' });
    expect(fixture.componentInstance.otpReference).toBe('K9MT');
    expect(fixture.componentInstance.error).toContain('K9MT');
    expect(fixture.componentInstance.resendCountdown).toBeGreaterThan(0);
  });

  it('does not resend OTP while cooldown is active', async () => {
    fixture.componentInstance.phone = '90123456';
    fixture.componentInstance.step = 'otp';
    fixture.componentInstance.resendCountdown = 30;
    api.sendOtp.calls.reset();

    await fixture.componentInstance.resendOtp();

    expect(api.sendOtp).not.toHaveBeenCalled();
  });

  it('loads localities after OTP on registration flow', async () => {
    fixture.componentInstance.phone = '90123456';
    fixture.componentInstance.step = 'register-otp';
    fixture.componentInstance.isRegistrationFlow = true;
    fixture.componentInstance.otpForm.patchValue({ otp: '123456' });
    await fixture.componentInstance.submitOtp();

    expect(api.getLocalities).toHaveBeenCalled();
    expect(fixture.componentInstance.localities.length).toBe(2);
    expect(fixture.componentInstance.step).toBe('register-form');
  });

  it('asks to accept terms before sending the registration SMS', async () => {
    api.checkPhone.and.returnValue(of({ exists: false, pinConfigured: false, canRegister: true }));
    fixture.componentInstance.phoneForm.patchValue({ phone: '90123456' });
    await fixture.componentInstance.submitPhone();

    expect(api.sendOtp).not.toHaveBeenCalled();
    expect(fixture.componentInstance.step).toBe('register-consent');
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pas encore client');
    expect(text).toContain("n'est pas encore associé à un client d'AMENOUVEVE-YAVEH");
    expect(fixture.nativeElement.querySelector('[data-testid="e2e-auth-otp-input"]')).toBeNull();

    await fixture.componentInstance.continueRegistration();
    expect(api.sendOtp).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error).toContain("conditions d'utilisation");

    fixture.componentInstance.termsOpen = true;
    fixture.detectChanges();
    const termsText = fixture.nativeElement.textContent as string;
    expect(termsText).toContain("Position au moment de l'inscription");
    expect(termsText).toContain('Bonne foi et responsabilité');
    expect(termsText).toContain('payer régulièrement chaque échéance');
    expect(termsText).toContain('ne pas causer de dommage financier');

    fixture.componentInstance.setTermsAccepted(true);
    await fixture.componentInstance.continueRegistration();
    expect(api.sendOtp).toHaveBeenCalledWith({ phone: '90123456' });
    expect(fixture.componentInstance.step).toBe('register-otp');
  });

  it('returns to the phone step from the consent screen without sending an SMS', () => {
    fixture.componentInstance.step = 'register-consent';
    fixture.componentInstance.isRegistrationFlow = true;
    fixture.componentInstance.termsAccepted = true;
    fixture.componentInstance.goBack();

    expect(fixture.componentInstance.step).toBe('phone');
    expect(fixture.componentInstance.isRegistrationFlow).toBeFalse();
    expect(fixture.componentInstance.termsAccepted).toBeFalse();
    expect(api.sendOtp).not.toHaveBeenCalled();
  });

  it('shows phone hint for automatic account creation', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Pas encore de compte ? Saisissez simplement votre numéro de téléphone',
    );
  });

  it('verifies OTP then moves to setup-pin', async () => {
    fixture.componentInstance.phone = '90123456';
    fixture.componentInstance.step = 'otp';
    fixture.componentInstance.otpForm.patchValue({ otp: '123456' });
    await fixture.componentInstance.submitOtp();

    expect(api.verifyOtp).toHaveBeenCalledWith({ phone: '90123456', code: '123456' });
    expect(fixture.componentInstance.otpProofToken).toBe('proof-token');
    expect(fixture.componentInstance.step).toBe('setup-pin');
  });

  it('does not render Firebase recaptcha container', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#recaptcha-container')).toBeNull();
  });

  describe('redirection after login', () => {
    afterEach(() => {
      history.pushState({}, '', '/');
      session.clearSession();
    });

    it('goes to dashboard without returnUrl', async () => {
      history.pushState({}, '', '/auth');
      fixture.componentInstance.phone = '90123456';
      fixture.componentInstance.pinForm.patchValue({ pin: '1234' });
      await fixture.componentInstance.submitPin();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('returns to the requested page after login', async () => {
      history.pushState({}, '', '/auth?returnUrl=%2Fcatalog');
      fixture.componentInstance.phone = '90123456';
      fixture.componentInstance.pinForm.patchValue({ pin: '1234' });
      await fixture.componentInstance.submitPin();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/catalog');
    });

    it('ignores an external returnUrl', async () => {
      history.pushState({}, '', '/auth?returnUrl=https%3A%2F%2Fevil.example');
      fixture.componentInstance.phone = '90123456';
      fixture.componentInstance.pinForm.patchValue({ pin: '1234' });
      await fixture.componentInstance.submitPin();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('resets wizard on re-entry when session is cleared', () => {
    fixture.componentInstance.step = 'setup-pin';
    fixture.componentInstance.error = 'Erreur';
    session.clearSession();
    fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.step).toBe('phone');
    expect(fixture.componentInstance.error).toBe('');
  });
});
