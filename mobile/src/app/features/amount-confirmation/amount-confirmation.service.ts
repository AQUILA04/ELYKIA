import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AmountConfirmationModalComponent } from './modals/amount-confirmation-modal/amount-confirmation-modal.component';

export class AmountConfirmationCancelledError extends Error {
  constructor(message = 'Confirmation du montant annulée.') {
    super(message);
    this.name = 'AmountConfirmationCancelledError';
  }
}

@Injectable({ providedIn: 'root' })
export class AmountConfirmationService {

  constructor(private readonly modalController: ModalController) {}

  /**
   * Affiche la modale de confirmation du montant.
   * Retourne le montant confirmé (identique au montant calculé).
   * Lance AmountConfirmationCancelledError si l'utilisateur annule ou saisit un montant incorrect.
   */
  async confirmAmount(calculatedAmount: number): Promise<number> {
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
      throw new AmountConfirmationCancelledError();
    }

    return data.confirmedAmount;
  }
}
