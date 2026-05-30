import { Injectable } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { LoggerService } from '../../core/services/logger.service';
import { AmountConfirmationModalComponent } from './modals/amount-confirmation-modal/amount-confirmation-modal.component';

export class AmountConfirmationCancelledError extends Error {
  constructor(message = 'Confirmation du montant annulée.') {
    super(message);
    this.name = 'AmountConfirmationCancelledError';
  }
}

@Injectable({ providedIn: 'root' })
export class AmountConfirmationService {

  constructor(
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly log: LoggerService
  ) {}

  /**
   * Affiche la modale de confirmation du montant.
   * Retourne le montant confirmé (identique au montant calculé).
   * Lance AmountConfirmationCancelledError si l'utilisateur annule ou saisit un montant incorrect.
   */
  async confirmAmount(calculatedAmount: number): Promise<number> {
    await this.dismissActiveLoading();

    void this.log.log(`[AmountConfirmation][OPEN] calculatedAmount=${calculatedAmount}`);

    const modal = await this.modalController.create({
      component: AmountConfirmationModalComponent,
      componentProps: { calculatedAmount },
      backdropDismiss: false,
      cssClass: 'amount-confirmation-modal'
    });

    await modal.present();
    const { data } = await modal.onDidDismiss<{
      confirmed?: boolean;
      confirmedAmount?: number;
    }>();

    if (!data?.confirmed || data.confirmedAmount === undefined) {
      void this.log.log(`[AmountConfirmation][CANCELLED] calculatedAmount=${calculatedAmount}`);
      throw new AmountConfirmationCancelledError();
    }

    void this.log.log(
      `[AmountConfirmation][CONFIRMED] calculatedAmount=${calculatedAmount} confirmedAmount=${data.confirmedAmount}`
    );
    return data.confirmedAmount;
  }

  private async dismissActiveLoading(): Promise<void> {
    try {
      const loading = await this.loadingController.getTop();
      if (loading) {
        await loading.dismiss();
      }
    } catch {
      // Aucun loader actif ou déjà fermé.
    }
  }
}
