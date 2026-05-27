import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';
import { SyncConsentService } from '../../../../core/sync-consent/sync-consent.service';
import { SYNC_CONSENT_MESSAGE_VERSION } from '../../../../core/sync-consent/models/sync-consent-history.model';

type ConsentStep = 'password' | 'confirmation';

@Component({
  selector: 'app-sync-consent-modal',
  templateUrl: './sync-consent-modal.component.html',
  styleUrls: ['./sync-consent-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class SyncConsentModalComponent implements OnInit {
  readonly consentMessageVersion = SYNC_CONSENT_MESSAGE_VERSION;

  readonly consentText =
    'Je confirme lancer volontairement une session de synchronisation complète. ' +
    'Je comprends que mes données locales (clients, distributions, recouvrements, commandes, tontine, etc.) ' +
    'seront transmises au serveur et que cette opération engage ma responsabilité. ' +
    'Je reconnais que la synchronisation ne se fait pas automatiquement à ma place : ' +
    'c\'est moi qui déclenche et valide cette action.';

  readonly checkboxLabel =
    'J\'ai lu ce message et j\'assume la responsabilité de lancer cette synchronisation.';

  step: ConsentStep = 'password';
  password = '';
  passwordVisible = false;
  challengeCode = '';
  challengeInput = '';
  consentChecked = false;
  isSubmitting = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly authService: AuthService,
    private readonly syncConsentService: SyncConsentService,
    private readonly toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.challengeCode = this.syncConsentService.generateChallengeCode();
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  async cancel(): Promise<void> {
    await this.modalController.dismiss();
  }

  async submitPassword(): Promise<void> {
    if (!this.password.trim()) {
      await this.showToast('Saisissez votre mot de passe.', 'warning');
      return;
    }

    this.isSubmitting = true;
    try {
      const valid = await this.authService.verifyCurrentUserPassword(this.password);
      if (!valid) {
        await this.showToast('Mot de passe incorrect.', 'danger');
        return;
      }
      this.challengeCode = this.syncConsentService.generateChallengeCode();
      this.challengeInput = '';
      this.consentChecked = false;
      this.step = 'confirmation';
    } finally {
      this.isSubmitting = false;
    }
  }

  async confirmSync(): Promise<void> {
    const normalizedInput = this.syncConsentService.normalizeChallengeInput(this.challengeInput);

    if (normalizedInput !== this.challengeCode) {
      await this.showToast('Le code saisi ne correspond pas. Vérifiez et réessayez.', 'warning');
      return;
    }

    if (!this.consentChecked) {
      await this.showToast('Cochez la case de confirmation pour continuer.', 'warning');
      return;
    }

    await this.modalController.dismiss({
      confirmed: true,
      challengeCode: this.challengeCode,
      challengeEntered: normalizedInput,
      consentedAt: new Date().toISOString()
    });
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
