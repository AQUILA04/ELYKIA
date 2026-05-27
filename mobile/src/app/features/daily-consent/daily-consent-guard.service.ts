import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { DailyConsentStateService } from '../../core/daily-consent/daily-consent-state.service';
import { DailyConsentService } from '../../core/daily-consent/daily-consent.service';
import { DailyConsentCancelledError } from '../../core/daily-consent/daily-consent.errors';
import { DailyConsentModalComponent } from './modals/daily-consent-modal/daily-consent-modal.component';

@Injectable({ providedIn: 'root' })
export class DailyConsentGuardService {
  private presenting = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly authService: AuthService,
    private readonly stateService: DailyConsentStateService,
    private readonly dailyConsentService: DailyConsentService
  ) {}

  /**
   * Appeler avant chaque création d'opération financière locale.
   * Si le consentement du jour est déjà actif, retourne immédiatement.
   * Sinon, présente la modale. Lance DailyConsentCancelledError si l'utilisateur annule.
   */
  async requireDailyConsent(): Promise<void> {
    const user = this.authService.currentUser;
    if (!user?.username) {
      throw new DailyConsentCancelledError('Utilisateur non connecté.');
    }

    if (this.stateService.isConsentActiveForToday(user.username)) {
      return;
    }

    if (this.presenting) {
      throw new DailyConsentCancelledError('Une demande de consentement est déjà en cours.');
    }

    this.presenting = true;
    try {
      const actionDate = new Date().toISOString().slice(0, 10);
      const modal = await this.modalController.create({
        component: DailyConsentModalComponent,
        componentProps: { actionDate },
        backdropDismiss: false,
        cssClass: 'daily-consent-modal'
      });

      await modal.present();
      const { data } = await modal.onDidDismiss<{
        confirmed?: boolean;
        challengeCode?: string;
        challengeEntered?: string;
      }>();

      if (!data?.confirmed || !data.challengeCode || !data.challengeEntered) {
        throw new DailyConsentCancelledError();
      }

      await this.dailyConsentService.recordConsent(
        user.username,
        data.challengeCode,
        data.challengeEntered
      );
    } finally {
      this.presenting = false;
    }
  }
}
