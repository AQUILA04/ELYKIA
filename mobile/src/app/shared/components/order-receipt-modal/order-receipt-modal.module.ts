import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { OrderReceiptModalComponent } from './order-receipt-modal.component';
import { ReceiptOrderLinesModule } from '../receipt-order-lines/receipt-order-lines.module';

@NgModule({
  declarations: [OrderReceiptModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    ReceiptOrderLinesModule
  ],
  exports: [OrderReceiptModalComponent]
})
export class OrderReceiptModalModule { }
