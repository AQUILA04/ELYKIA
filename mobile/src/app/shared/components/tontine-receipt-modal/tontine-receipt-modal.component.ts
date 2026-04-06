import { Component, Input } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
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
        private loadingController: LoadingController,
        private printingService: PrintingService,
        private pdfService: PdfService
    ) { }

    async ionViewDidEnter() {
        setTimeout(async () => {
            const content = document.getElementById('receipt-content');
            if (content) {
                const loading = await this.loadingController.create({
                    message: 'Enregistrement des données en cours...',
                    backdropDismiss: false
                });
                await loading.present();
                try {
                    await this.pdfService.saveReceipt(
                        content,
                        'collecte_tontine',
                        this.data.collection.id
                    );
                    await loading.dismiss();
                } catch (e) {
                    console.error('Failed to auto-save PDF receipt', e);
                    await loading.dismiss();
                }
            }
        }, 500);
    }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    async print() {
        await this.printingService.printTontineReceipt(this.data);
    }
}
