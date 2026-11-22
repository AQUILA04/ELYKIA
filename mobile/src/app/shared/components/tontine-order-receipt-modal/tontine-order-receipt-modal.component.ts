import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PrintableTontineOrder, PrintingService } from '../../../core/services/printing.service';
import { ReceiptOutputService } from '../../../core/services/receipt-output.service';
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
  @ViewChild('receiptContent', { read: ElementRef }) receiptContent?: ElementRef<HTMLElement>;

  printing = false;

  constructor(
    private modalCtrl: ModalController,
    private printingService: PrintingService,
    private receiptOutput: ReceiptOutputService
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

  /** Comme les reçus de vente : le reçu est enregistré en PDF dès l'ouverture de l'aperçu. */
  async ionViewDidEnter(): Promise<void> {
    await this.receiptOutput.savePdf(this.receiptContent?.nativeElement ?? null, 'commande_tontine', this.reference);
  }

  dismiss() {
    void this.modalCtrl.dismiss();
  }

  async print() {
    if (!this.data || this.printing) {
      return;
    }
    this.printing = true;
    try {
      await this.receiptOutput.printOrSavePdf({
        print: () => this.printingService.printTontineOrderReceipt(this.data),
        element: this.receiptContent?.nativeElement ?? null,
        type: 'commande_tontine',
        reference: this.reference
      });
    } finally {
      this.printing = false;
    }
  }

  private get reference(): string {
    return this.data?.reference || 'commande-tontine';
  }
}
