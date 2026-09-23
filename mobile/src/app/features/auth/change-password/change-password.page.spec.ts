import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { ChangePasswordPage } from './change-password.page';
import { AuthService } from '../../../core/services/auth.service';

describe('ChangePasswordPage', () => {
  let component: ChangePasswordPage;
  let fixture: ComponentFixture<ChangePasswordPage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let loadingControllerSpy: jasmine.SpyObj<LoadingController>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;

  const mockLoading = { present: jasmine.createSpy('present'), dismiss: jasmine.createSpy('dismiss') };
  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['mustChangePassword', 'changePassword', 'logout']);
    authServiceSpy.mustChangePassword.and.returnValue(false);
    authServiceSpy.changePassword.and.resolveTo();

    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    loadingControllerSpy = jasmine.createSpyObj('LoadingController', ['create']);
    loadingControllerSpy.create.and.resolveTo(mockLoading as any);
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.resolveTo(mockToast as any);

    await TestBed.configureTestingModule({
      declarations: [ChangePasswordPage],
      imports: [IonicModule.forRoot(), ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LoadingController, useValue: loadingControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show oldPassword field in normal mode', () => {
    component.forcedMode = false;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.form.contains('oldPassword')).toBeTrue();
  });

  it('should hide oldPassword field in forced mode', () => {
    authServiceSpy.mustChangePassword.and.returnValue(true);
    const forcedComponent = new ChangePasswordPage(
      TestBed.inject(ReactiveFormsModule) as any,
      authServiceSpy,
      routerSpy,
      loadingControllerSpy,
      toastControllerSpy
    );
    expect(forcedComponent.forcedMode).toBeTrue();
  });

  it('should require oldPassword in normal mode', () => {
    component.forcedMode = false;
    component.form.patchValue({ oldPassword: '', newPassword: 'Test123', confirmPassword: 'Test123' });
    expect(component.form.get('oldPassword')?.invalid).toBeTrue();
  });

  it('should show error when passwords do not match', async () => {
    component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'different' });
    await component.onSubmit();
    expect(toastControllerSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({ message: 'Les mots de passe ne correspondent pas.', color: 'danger' })
    );
  });

  it('should call changePassword with oldPassword in normal mode', async () => {
    component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
    await component.onSubmit();
    expect(authServiceSpy.changePassword).toHaveBeenCalledWith('nouveau123', false, 'ancien123');
  });

  it('should navigate to /initial-loading after success', async () => {
    authServiceSpy.currentUser = null as any;
    component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
    await component.onSubmit();
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/initial-loading');
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
