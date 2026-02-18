import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PrintingService, PrintableTontineCollection } from 'src/app/core/services/printing.service';
import { PdfService } from 'src/app/core/services/pdf.service';

@Component({
    selector: 'app-tontine-receipt-modal',
    templateUrl: './tontine-receipt-modal.component.html',
    styleUrls: ['./tontine-receipt-modal.component.scss'],
    standalone: false
})
export class TontineReceiptModalComponent {
    @Input() data!: PrintableTontineCollection;

    constructor(
        private modalCtrl: ModalController,
        private printingService: PrintingService,
        private pdfService: PdfService
    ) { }

    async ionViewDidEnter() {
        setTimeout(async () => {
            const content = document.getElementById('receipt-content');
            if (content) {
                try {
                    await this.pdfService.saveReceipt(
                        content,
                        'collecte_tontine',
                        this.data.collection.id
                    );
                } catch (e) {
                    console.error('Failed to auto-save PDF receipt', e);
                }
            }
        }, 500);
    }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    async print() {
        await this.printingService.printTontineReceipt(this.data);
        // Optional: Dismiss after print or keep open?
        // Usually keep open in case print fails or user wants to print again.
        // But user request said "Print" or "Close".
    }
}
