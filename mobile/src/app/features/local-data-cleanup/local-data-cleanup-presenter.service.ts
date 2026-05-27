import { Injectable } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { LocalDataCleanupService } from '../../core/local-data-cleanup/local-data-cleanup.service';
import { LocalDataCleanupModalComponent } from './modals/local-data-cleanup-modal/local-data-cleanup-modal.component';
import * as DistributionActions from '../../store/distribution/distribution.actions';

@Injectable({ providedIn: 'root' })
export class LocalDataCleanupPresenterService {
  private presenting = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly cleanupService: LocalDataCleanupService,
    private readonly toastController: ToastController,
    private readonly store: Store
  ) {}

  /**
   * À appeler depuis le dashboard (ionViewWillEnter).
   * N'affiche rien si déjà traité aujourd'hui ou aucune donnée obsolète.
   */
  async tryPresentCleanupModal(commercialUsername: string): Promise<void> {
    if (this.presenting) {
      return;
    }

    const purgedCount = await this.cleanupService.purgeExpiredLocalData(commercialUsername);
    if (purgedCount > 0) {
      this.store.dispatch(
        DistributionActions.loadDistributions({ commercialUsername })
      );
    }

    const shouldPrompt = await this.cleanupService.shouldPromptUser(commercialUsername);
    if (!shouldPrompt) {
      return;
    }

    const sections = await this.cleanupService.loadSections(commercialUsername);
    if (sections.length === 0) {
      await this.cleanupService.markPromptHandledForToday(commercialUsername);
      return;
    }

    this.presenting = true;
    try {
      const modal = await this.modalController.create({
        component: LocalDataCleanupModalComponent,
        componentProps: { commercialUsername, sections },
        backdropDismiss: false,
        cssClass: 'local-data-cleanup-modal'
      });

      await modal.present();
      const result = await modal.onDidDismiss();

      if (result.data?.deleted) {
        this.store.dispatch(
          DistributionActions.loadDistributions({ commercialUsername })
        );
        await this.showToast(
          `${result.data.totalDeleted} élément(s) supprimé(s).`,
          'success'
        );
      }
    } finally {
      this.presenting = false;
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
