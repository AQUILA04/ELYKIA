import { Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { PrintableTontineOrder, PrintingService } from '../../../core/services/printing.service';
import { getTontineDeliveryStatusLabel } from '../../../core/utils/tontine-delivery-status.util';

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
