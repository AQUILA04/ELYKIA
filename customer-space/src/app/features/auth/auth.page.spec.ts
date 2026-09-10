import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthPage } from './auth.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { FeatureFlagService } from '../../shared/services/feature-flag.service';
import { APP_UNAVAILABLE_MESSAGE } from '../../shared/constants/app-availability';
import { IonicModule } from '@ionic/angular';

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  let api: jasmine.SpyObj<CustomerApiService>;
  let router: jasmine.SpyObj<Router>;
  let featureFlags: jasmine.SpyObj<FeatureFlagService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('CustomerApiService', [
      'checkPhone', 'login', 'setupPin', 'sendOtp', 'verifyOtp',
    ]);
    api.checkPhone.and.returnValue(of({ exists: true, pinConfigured: true, maskedName: 'Jean' }));
    api.login.and.returnValue(of({
      token: 't',
      clientId: '1',
      fullName: 'Jean',
      phone: '90123456',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));
    api.sendOtp.and.returnValue(of({ channel: 'SMS' }));
    api.verifyOtp.and.returnValue(of({ verified: true, otpProofToken: 'proof-token' }));

    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthPage);
  });

  it('starts on phone step', () => {
    expect(fixture.componentInstance.step).toBe('phone');
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

  it('resets wizard on re-entry when session is cleared', () => {
    fixture.componentInstance.step = 'setup-pin';
    fixture.componentInstance.error = 'Erreur';
    fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.step).toBe('phone');
    expect(fixture.componentInstance.error).toBe('');
  });
});
