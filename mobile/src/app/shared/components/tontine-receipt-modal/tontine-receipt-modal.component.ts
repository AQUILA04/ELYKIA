import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PrintingService, PrintableTontineCollection } from 'src/app/core/services/printing.service';
import { ReceiptOutputService } from 'src/app/core/services/receipt-output.service';

/** Reçu de cotisation tontine : enregistré en PDF à l'ouverture, imprimé ou repli PDF. */
@Component({
    selector: 'app-tontine-receipt-modal',
    templateUrl: './tontine-receipt-modal.component.html',
    styleUrls: ['./tontine-receipt-modal.component.scss'],
    standalone: false
})
export class TontineReceiptModalComponent {
    @Input() data!: PrintableTontineCollection;
    @ViewChild('receiptContent', { read: ElementRef }) receiptContent?: ElementRef<HTMLElement>;

    printing = false;

    constructor(
        private modalCtrl: ModalController,
        private printingService: PrintingService,
        private receiptOutput: ReceiptOutputService
    ) { }

    async ionViewDidEnter(): Promise<void> {
        await this.receiptOutput.savePdf(this.receiptContent?.nativeElement ?? null, 'collecte_tontine', this.reference);
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
                print: () => this.printingService.printTontineReceipt(this.data),
                element: this.receiptContent?.nativeElement ?? null,
                type: 'collecte_tontine',
                reference: this.reference
            });
        } finally {
            this.printing = false;
        }
    }

    private get reference(): string {
        return String(this.data?.collection?.id ?? 'collecte-tontine');
    }
}
