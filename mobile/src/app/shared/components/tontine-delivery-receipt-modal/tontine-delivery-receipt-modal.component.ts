import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PrintingService, PrintableTontineDelivery } from 'src/app/core/services/printing.service';

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
        private printingService: PrintingService
    ) { }

    dismiss() {
        this.modalCtrl.dismiss();
    }

    async print() {
        await this.printingService.printTontineDeliveryReceipt(this.data);
    }
}
