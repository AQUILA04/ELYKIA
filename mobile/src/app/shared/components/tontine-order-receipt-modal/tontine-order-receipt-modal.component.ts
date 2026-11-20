import { Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { PrintableTontineOrder, PrintingService } from '../../../core/services/printing.service';
import { getTontineDeliveryStatusLabel } from '../../../core/utils/tontine-delivery-status.util';
import {
  TontineOrderBalance,
  computeTontineOrderBalance,
  tontineOrderBalanceLabels
} from '../../../core/utils/tontine-order-balance.util';

@Component({
  selector: 'app-tontine-order-receipt-modal',
  templateUrl: './tontine-order-receipt-modal.component.html',
  styleUrls: [
    '../order-receipt-modal/order-receipt-modal.component.scss',
    './tontine-order-receipt-modal.component.scss'
  ],
  standalone: false
})
export class TontineOrderReceiptModalComponent {
  @Input() data!: PrintableTontineOrder;

  constructor(
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private printingService: PrintingService
  ) {}

  get statusLabel(): string {
    return getTontineDeliveryStatusLabel(this.data?.status);
  }

  /** Solde net, reste à payer ou reliquat ; absent si le solde du membre n'est pas connu. */
  get balance(): TontineOrderBalance | null {
    if (!this.data || this.data.netContribution === null || this.data.netContribution === undefined) {
      return null;
    }
    return computeTontineOrderBalance(this.data.netContribution, this.data.totalAmount);
  }

  get labels() {
    return tontineOrderBalanceLabels(this.data?.status === 'DELIVERED');
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async print() {
    if (!this.data) {
      return;
    }
    try {
      await this.printingService.printTontineOrderReceipt(this.data);
      await this.showToast('Reçu imprimé avec succès !', 'success');
      await this.modalCtrl.dismiss({ printed: true });
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Impossible d\'imprimer le reçu';
      await this.showToast(message, 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
