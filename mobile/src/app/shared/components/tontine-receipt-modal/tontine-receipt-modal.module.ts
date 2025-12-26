import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TontineReceiptModalComponent } from './tontine-receipt-modal.component';

@NgModule({
    declarations: [TontineReceiptModalComponent],
    imports: [
        CommonModule,
        IonicModule
    ],
    exports: [TontineReceiptModalComponent]
})
export class TontineReceiptModalModule { }
