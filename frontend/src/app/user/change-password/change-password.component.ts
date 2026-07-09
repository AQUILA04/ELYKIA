import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/service/auth.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ChangePasswordRequest, UserService } from '../service/user.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!newPassword || !confirmPassword) {
    return null;
  }
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ChangePasswordComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  isSubmitting = false;
  hideOld = true;
  hideNew = true;
  hideConfirm = true;
  forcedMode = false;

  currentDate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.forcedMode = this.route.snapshot.queryParamMap.get('forced') === 'true'
      || this.authService.mustChangePassword();

    this.form = this.formBuilder.group(
      {
        oldPassword: ['', this.forcedMode ? [] : Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    );

    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  get username(): string {
    return this.authService.getCurrentUser()?.username ?? '';
  }

  onCancel(): void {
    if (this.forcedMode) {
      this.authService.logout();
      return;
    }
    this.router.navigate(['/home']);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user?.id || !user?.username) {
      this.alertService.showError('Impossible d\'identifier votre compte. Reconnectez-vous.');
      return;
    }

    if (!this.forcedMode && this.form.value.oldPassword === this.form.value.newPassword) {
      this.alertService.showError('Le nouveau mot de passe doit être différent de l\'ancien.');
      return;
    }

    const payload: ChangePasswordRequest = {
      id: user.id,
      username: user.username,
      newPassword: this.form.value.newPassword,
      forced: this.forcedMode || undefined,
    };

    if (!this.forcedMode) {
      payload.oldPassword = this.form.value.oldPassword;
    }

    this.isSubmitting = true;
    this.userService.changePassword(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.authService.clearMustChangePasswordFlag();
        this.alertService.showDefaultSucces(
          this.forcedMode
            ? 'Votre mot de passe a été défini. Vous pouvez continuer.'
            : 'Votre mot de passe a été modifié avec succès.'
        );
        this.form.reset();
        this.hideOld = this.hideNew = this.hideConfirm = true;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const message = err?.error?.message || 'Erreur lors du changement de mot de passe.';
        this.alertService.showError(message);
      }
    });
  }
}
