import { Component, Input } from '@angular/core';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import {
  formatClientDisplayName,
  formatOrderStatusLabel,
  PrintableOrder,
  PrintingService
} from '../../../core/services/printing.service';
import { PdfService } from '../../../core/services/pdf.service';

@Component({
  selector: 'app-order-receipt-modal',
  templateUrl: './order-receipt-modal.component.html',
  styleUrls: ['./order-receipt-modal.component.scss'],
  standalone: false
})
export class OrderReceiptModalComponent {
  @Input() data!: PrintableOrder;

  constructor(
    private modalCtrl: ModalController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private printingService: PrintingService,
    private pdfService: PdfService
  ) {}

  get clientDisplayName(): string {
    return formatClientDisplayName(this.data?.client);
  }

  get statusLabel(): string {
    return formatOrderStatusLabel(this.data?.status);
  }

  async ionViewDidEnter() {
    setTimeout(async () => {
      const content = document.getElementById('receipt-content');
      if (!content || !this.data) {
        return;
      }

      const loading = await this.loadingController.create({
        message: 'Enregistrement des données en cours...',
        backdropDismiss: false
      });
      await loading.present();
      try {
        await this.pdfService.saveReceipt(
          content,
          'commande',
          this.data.reference || 'commande'
        );
        await loading.dismiss();
      } catch (e) {
        console.error('Failed to auto-save PDF receipt', e);
        await loading.dismiss();
      }
    }, 500);
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async print() {
    if (!this.data) {
      return;
    }

    try {
      await this.printingService.printOrderReceipt(this.data);
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
