import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TontineDeliveryReceiptModalComponent } from './tontine-delivery-receipt-modal.component';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';

@NgModule({
    declarations: [TontineDeliveryReceiptModalComponent],
    imports: [
        CommonModule,
        IonicModule,
        IfUnitPriceDirective
    ],
    exports: [TontineDeliveryReceiptModalComponent]
})
export class TontineDeliveryReceiptModalModule { }
