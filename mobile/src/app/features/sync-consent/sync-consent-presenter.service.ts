import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { SyncConsentService } from '../../core/sync-consent/sync-consent.service';
import { SyncConsentCancelledError } from '../../core/sync-consent/sync-consent.errors';
import { SyncConsentModalComponent } from './modals/sync-consent-modal/sync-consent-modal.component';

@Injectable({ providedIn: 'root' })
export class SyncConsentPresenterService {
  private presenting = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly authService: AuthService,
    private readonly syncConsentService: SyncConsentService
  ) {}

  /**
   * Affiche la modale de consentement. Lance SyncConsentCancelledError si refus ou annulation.
   * Retourne le challengeCode validé (syncConsentCode) pour l'inclure dans les payloads de sync.
   */
  async requireConsentBeforeSync(): Promise<string> {
    const user = this.authService.currentUser;
    if (!user?.username) {
      throw new SyncConsentCancelledError('Utilisateur non connecté.');
    }

    if (this.presenting) {
      throw new SyncConsentCancelledError('Une demande de consentement est déjà en cours.');
    }

    this.presenting = true;
    try {
      const modal = await this.modalController.create({
        component: SyncConsentModalComponent,
        backdropDismiss: false,
        cssClass: 'sync-consent-modal'
      });

      await modal.present();
      const { data } = await modal.onDidDismiss<{
        confirmed?: boolean;
        challengeCode?: string;
        challengeEntered?: string;
        consentedAt?: string;
      }>();

      if (!data?.confirmed || !data.challengeCode || !data.challengeEntered || !data.consentedAt) {
        throw new SyncConsentCancelledError();
      }

      await this.syncConsentService.recordConsent(user.username, {
        challengeCode: data.challengeCode,
        challengeEntered: data.challengeEntered,
        consentedAt: data.consentedAt
      });

      return data.challengeCode;
    } finally {
      this.presenting = false;
    }
  }
}
