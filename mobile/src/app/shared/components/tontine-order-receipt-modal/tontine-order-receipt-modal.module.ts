import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TontineOrderReceiptModalComponent } from './tontine-order-receipt-modal.component';
import { ReceiptOrderLinesModule } from '../receipt-order-lines/receipt-order-lines.module';

@NgModule({
  declarations: [TontineOrderReceiptModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    ReceiptOrderLinesModule
  ],
  exports: [TontineOrderReceiptModalComponent]
})
export class TontineOrderReceiptModalModule { }
