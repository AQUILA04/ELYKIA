import { Component, Input } from '@angular/core';
import { LoadingController, ModalController } from '@ionic/angular';
import { PrintingService, PrintableTontineDelivery } from 'src/app/core/services/printing.service';
import { PdfService } from 'src/app/core/services/pdf.service';

@Component({
    selector: 'app-tontine-delivery-receipt-modal',
    templateUrl: './tontine-delivery-receipt-modal.component.html',
    styleUrls: ['./tontine-delivery-receipt-modal.component.scss'],
    standalone: false
})
export class TontineDeliveryReceiptModalComponent {
    @Input() data!: PrintableTontineDelivery;

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
                        'livraison_tontine',
                        this.data.delivery.id
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
        await this.printingService.printTontineDeliveryReceipt(this.data);
    }
}
