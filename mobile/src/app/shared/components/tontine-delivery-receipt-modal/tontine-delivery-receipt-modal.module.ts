import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TontineDeliveryReceiptModalComponent } from './tontine-delivery-receipt-modal.component';

@NgModule({
    declarations: [TontineDeliveryReceiptModalComponent],
    imports: [
        CommonModule,
        IonicModule
    ],
    exports: [TontineDeliveryReceiptModalComponent]
})
export class TontineDeliveryReceiptModalModule { }
