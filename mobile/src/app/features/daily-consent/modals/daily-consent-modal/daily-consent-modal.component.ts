import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';
import { DailyConsentService } from '../../../../core/daily-consent/daily-consent.service';
import { DAILY_CONSENT_MESSAGE_VERSION } from '../../../../core/daily-consent/models/daily-consent-history.model';

type ConsentStep = 'password' | 'confirmation';

@Component({
  selector: 'app-daily-consent-modal',
  templateUrl: './daily-consent-modal.component.html',
  styleUrls: ['./daily-consent-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DailyConsentModalComponent implements OnInit {
  @Input() actionDate!: string;

  readonly consentMessageVersion = DAILY_CONSENT_MESSAGE_VERSION;

  get consentText(): string {
    const dateStr = this.formatDate(this.actionDate);
    return (
      `Je confirme démarrer volontairement l'enregistrement de mes opérations commerciales pour la journée du ${dateStr}. ` +
      'Je comprends que toutes les distributions, recouvrements, commandes et opérations de tontine que j\'enregistrerai ce jour ' +
      'seront tracées sous mon nom et ne pourront pas être attribuées à un autre utilisateur ou à un processus automatique. ' +
      'Chaque opération engage ma responsabilité commerciale et financière.'
    );
  }

  readonly checkboxLabel =
    'J\'ai lu ce message, je confirme être présent sur le terrain ce jour et j\'assume la responsabilité de l\'ensemble des opérations que j\'enregistrerai.';

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
    private readonly dailyConsentService: DailyConsentService,
    private readonly toastController: ToastController
  ) {}

  ngOnInit(): void {
    if (!this.actionDate) {
      this.actionDate = new Date().toISOString().slice(0, 10);
    }
    this.challengeCode = this.dailyConsentService.generateChallengeCode();
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  async cancel(): Promise<void> {
    await this.modalController.dismiss({ confirmed: false });
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
      this.challengeCode = this.dailyConsentService.generateChallengeCode();
      this.challengeInput = '';
      this.consentChecked = false;
      this.step = 'confirmation';
    } finally {
      this.isSubmitting = false;
    }
  }

  async confirmConsent(): Promise<void> {
    const normalizedInput = this.dailyConsentService.normalizeChallengeInput(this.challengeInput);

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
      challengeEntered: normalizedInput
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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
