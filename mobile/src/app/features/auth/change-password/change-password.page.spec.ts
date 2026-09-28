import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { ChangePasswordPage } from './change-password.page';
import { AuthService } from '../../../core/services/auth.service';

describe('ChangePasswordPage', () => {
  let component: ChangePasswordPage;
  let fixture: ComponentFixture<ChangePasswordPage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;
  let loadingControllerSpy: jasmine.SpyObj<LoadingController>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;

  const mockLoading = {
    present: jasmine.createSpy('present').and.resolveTo(),
    dismiss: jasmine.createSpy('dismiss').and.resolveTo(),
  };
  const mockToast = {
    present: jasmine.createSpy('present').and.resolveTo(),
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj(
      'AuthService',
      ['mustChangePassword', 'changePassword', 'logout'],
      { currentUser: null }
    );
    authServiceSpy.mustChangePassword.and.returnValue(false);
    authServiceSpy.changePassword.and.resolveTo();

    loadingControllerSpy = jasmine.createSpyObj('LoadingController', ['create']);
    loadingControllerSpy.create.and.resolveTo(mockLoading as any);

    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.resolveTo(mockToast as any);

    await TestBed.configureTestingModule({
      declarations: [ChangePasswordPage],
      imports: [
        IonicModule.forRoot(),
        ReactiveFormsModule,
        RouterTestingModule,
      ],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: LoadingController, useValue: loadingControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ChangePasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be in normal mode by default', () => {
    expect(component.forcedMode).toBeFalse();
  });

  it('should be in forced mode when mustChangePassword returns true', async () => {
    authServiceSpy.mustChangePassword.and.returnValue(true);
    // Re-create component to pick up forced mode in constructor
    const forcedFixture = TestBed.createComponent(ChangePasswordPage);
    const forcedComponent = forcedFixture.componentInstance;
    expect(forcedComponent.forcedMode).toBeTrue();
  });

  it('should require oldPassword in normal mode', () => {
    component.form.patchValue({ oldPassword: '', newPassword: 'Test123', confirmPassword: 'Test123' });
    expect(component.form.get('oldPassword')?.invalid).toBeTrue();
  });

  it('should not require oldPassword in forced mode', async () => {
    authServiceSpy.mustChangePassword.and.returnValue(true);
    const forcedFixture = TestBed.createComponent(ChangePasswordPage);
    const forcedComponent = forcedFixture.componentInstance;
    forcedComponent.form.patchValue({ newPassword: 'Test123', confirmPassword: 'Test123' });
    expect(forcedComponent.form.get('oldPassword')?.valid).toBeTrue();
  });

  it('should enforce minLength(6) on newPassword', () => {
    component.form.patchValue({ oldPassword: 'ancien', newPassword: '123', confirmPassword: '123' });
    expect(component.form.get('newPassword')?.invalid).toBeTrue();
  });

  it('should show error toast when passwords do not match', async () => {
    component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'different' });
    await component.onSubmit();
    expect(toastControllerSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ message: 'Les mots de passe ne correspondent pas.', color: 'danger' })
    );
  });

  it('should call changePassword with correct arguments in normal mode', async () => {
    component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
    await component.onSubmit();
    expect(authServiceSpy.changePassword).toHaveBeenCalledWith('nouveau123', false, 'ancien123');
  });

  it('should navigate to /initial-loading after success for non-RM user', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
    await component.onSubmit();
    expect(navigateSpy).toHaveBeenCalledWith('/initial-loading');
  });

  it('should show error toast on changePassword failure', async () => {
    authServiceSpy.changePassword.and.rejectWith(new Error('Ancien mot de passe incorrect.'));
    component.form.patchValue({ oldPassword: 'mauvais', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
    await component.onSubmit();
    expect(toastControllerSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ message: 'Ancien mot de passe incorrect.', color: 'danger' })
    );
  });
});
