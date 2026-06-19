import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthPage } from './auth.page';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { FirebaseAuthService } from '../../shared/services/firebase-auth.service';
import { IonicModule } from '@ionic/angular';

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  let api: jasmine.SpyObj<CustomerApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    api = jasmine.createSpyObj('CustomerApiService', ['checkPhone', 'login', 'setupPin']);
    api.checkPhone.and.returnValue(of({ exists: true, pinConfigured: true, maskedName: 'Jean' }));
    api.login.and.returnValue(of({
      token: 't',
      clientId: '1',
      fullName: 'Jean',
      phone: '90123456',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));

    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [AuthPage, ReactiveFormsModule, IonicModule.forRoot()],
      providers: [
        { provide: CustomerApiService, useValue: api },
        CustomerSessionService,
        { provide: FirebaseAuthService, useValue: jasmine.createSpyObj('FirebaseAuthService', ['isConfigured', 'sendOtp', 'verifyOtp']) },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthPage);
  });

  it('starts on phone step', () => {
    expect(fixture.componentInstance.step).toBe('phone');
  });

  it('moves to pin step when phone is recognized', async () => {
    fixture.componentInstance.phoneForm.patchValue({ phone: '90123456' });
    await fixture.componentInstance.submitPhone();
    expect(fixture.componentInstance.step).toBe('pin');
  });
});
