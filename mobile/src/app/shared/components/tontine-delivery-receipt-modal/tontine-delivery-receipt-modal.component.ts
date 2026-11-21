import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PrintingService, PrintableTontineDelivery } from 'src/app/core/services/printing.service';
import { ReceiptOutputService } from 'src/app/core/services/receipt-output.service';

/** Bon de remise tontine : enregistré en PDF à l'ouverture, imprimé ou repli PDF. */
@Component({
    selector: 'app-tontine-delivery-receipt-modal',
    templateUrl: './tontine-delivery-receipt-modal.component.html',
    styleUrls: ['./tontine-delivery-receipt-modal.component.scss'],
    standalone: false
})
export class TontineDeliveryReceiptModalComponent {
    @Input() data!: PrintableTontineDelivery;
    @ViewChild('receiptContent', { read: ElementRef }) receiptContent?: ElementRef<HTMLElement>;

    printing = false;

    constructor(
        private modalCtrl: ModalController,
        private printingService: PrintingService,
        private receiptOutput: ReceiptOutputService
    ) { }

    async ionViewDidEnter(): Promise<void> {
        await this.receiptOutput.savePdf(this.receiptContent?.nativeElement ?? null, 'livraison_tontine', this.reference);
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
                print: () => this.printingService.printTontineDeliveryReceipt(this.data),
                element: this.receiptContent?.nativeElement ?? null,
                type: 'livraison_tontine',
                reference: this.reference
            });
        } finally {
            this.printing = false;
        }
    }

    private get reference(): string {
        return String(this.data?.delivery?.id ?? 'livraison-tontine');
    }
}
