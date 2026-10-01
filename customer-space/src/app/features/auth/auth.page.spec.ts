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
import { IonicModule } from '@ionic/angular';

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  let api: jasmine.SpyObj<CustomerApiService>;
  let router: jasmine.SpyObj<Router>;
  let featureFlags: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(async () => {
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
    expect(fixture.nativeElement.textContent).toContain('Bon retour !');
    expect(fixture.nativeElement.textContent).toContain('Connectez-vous à votre espace');
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
      localStorage.removeItem('elykia_customer_session');
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
    fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.step).toBe('phone');
    expect(fixture.componentInstance.error).toBe('');
  });
});
