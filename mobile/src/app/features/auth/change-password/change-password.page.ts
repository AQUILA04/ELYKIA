import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { canAccessRecoveryManagerMobile } from '../../../core/utils/rm-user.util';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  standalone: false,
})
export class ChangePasswordPage {
  form: FormGroup;
  forcedMode = false;
  passwordVisible = false;
  confirmVisible = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.forcedMode = this.authService.mustChangePassword();
    this.form = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) {
      await this.presentToast('Les mots de passe ne correspondent pas.', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Enregistrement…',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      await this.authService.changePassword(newPassword, this.forcedMode);
      await loading.dismiss();
      await this.presentToast('Mot de passe mis à jour avec succès.', 'success');
      const user = this.authService.currentUser;
      const rmMobile = canAccessRecoveryManagerMobile(user);
      this.router.navigateByUrl(rmMobile ? '/rm/plan' : '/initial-loading');
    } catch (error) {
      await loading.dismiss();
      const message = error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe.';
      await this.presentToast(message, 'danger');
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
