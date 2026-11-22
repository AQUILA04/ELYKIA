import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import type { MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonInput, LoadingController, ToastController } from '@ionic/angular';
import { ChangePasswordPage } from './change-password.page';
import { AuthService } from '../../../core/services/auth.service';

describe('ChangePasswordPage', () => {
    let component: ChangePasswordPage;
    let fixture: ComponentFixture<ChangePasswordPage>;
    let authServiceSpy: MockedObject<AuthService>;
    let router: Router;
    let loadingControllerSpy: MockedObject<LoadingController>;
    let toastControllerSpy: MockedObject<ToastController>;

    const mockLoading = {
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(undefined),
    };
    const mockToast = {
        present: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(async () => {
        authServiceSpy = {
            mustChangePassword: vi.fn().mockName("AuthService.mustChangePassword"),
            changePassword: vi.fn().mockName("AuthService.changePassword"),
            logout: vi.fn().mockName("AuthService.logout"),
            currentUser: null
        } as unknown as MockedObject<AuthService>;
        authServiceSpy.mustChangePassword.mockReturnValue(false);
        authServiceSpy.changePassword.mockResolvedValue(undefined);

        loadingControllerSpy = {
            create: vi.fn().mockName("LoadingController.create")
        } as unknown as MockedObject<LoadingController>;
        loadingControllerSpy.create.mockResolvedValue(mockLoading as any);

        toastControllerSpy = {
            create: vi.fn().mockName("ToastController.create")
        } as unknown as MockedObject<ToastController>;
        toastControllerSpy.create.mockResolvedValue(mockToast as any);

        await TestBed.configureTestingModule({
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: [ChangePasswordPage],
            imports: [
                ReactiveFormsModule,
                RouterTestingModule,
                IonInput,
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
        expect(component.forcedMode).toBe(false);
    });

    it('should be in forced mode when mustChangePassword returns true', async () => {
        authServiceSpy.mustChangePassword.mockReturnValue(true);
        // Re-create component to pick up forced mode in constructor
        const forcedFixture = TestBed.createComponent(ChangePasswordPage);
        const forcedComponent = forcedFixture.componentInstance;
        expect(forcedComponent.forcedMode).toBe(true);
    });

    it('should require oldPassword in normal mode', () => {
        component.form.patchValue({ oldPassword: '', newPassword: 'Test123', confirmPassword: 'Test123' });
        expect(component.form.get('oldPassword')?.invalid).toBe(true);
    });

    it('should not require oldPassword in forced mode', async () => {
        authServiceSpy.mustChangePassword.mockReturnValue(true);
        const forcedFixture = TestBed.createComponent(ChangePasswordPage);
        const forcedComponent = forcedFixture.componentInstance;
        forcedComponent.form.patchValue({ newPassword: 'Test123', confirmPassword: 'Test123' });
        expect(forcedComponent.form.get('oldPassword')?.valid).toBe(true);
    });

    it('should enforce minLength(6) on newPassword', () => {
        component.form.patchValue({ oldPassword: 'ancien', newPassword: '123', confirmPassword: '123' });
        expect(component.form.get('newPassword')?.invalid).toBe(true);
    });

    it('should show error toast when passwords do not match', async () => {
        component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'different' });
        await component.onSubmit();
        expect(toastControllerSpy.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Les mots de passe ne correspondent pas.', color: 'danger' }));
    });

    it('should call changePassword with correct arguments in normal mode', async () => {
        component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
        await component.onSubmit();
        expect(authServiceSpy.changePassword).toHaveBeenCalledWith('nouveau123', false, 'ancien123');
    });

    it('should navigate to /initial-loading after success for non-RM user', async () => {
        const navigateSpy = vi.spyOn(router, 'navigateByUrl');
        component.form.patchValue({ oldPassword: 'ancien123', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
        await component.onSubmit();
        expect(navigateSpy).toHaveBeenCalledWith('/initial-loading');
    });

    it('should show error toast on changePassword failure', async () => {
        authServiceSpy.changePassword.mockRejectedValue(new Error('Ancien mot de passe incorrect.'));
        component.form.patchValue({ oldPassword: 'mauvais', newPassword: 'nouveau123', confirmPassword: 'nouveau123' });
        await component.onSubmit();
        expect(toastControllerSpy.create).toHaveBeenCalledWith(expect.objectContaining({ message: 'Ancien mot de passe incorrect.', color: 'danger' }));
    });
});
