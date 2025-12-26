import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PrintReceiptModalComponent } from './print-receipt-modal.component';
import { QRCodeComponent } from 'angularx-qrcode';

@NgModule({
  declarations: [PrintReceiptModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    QRCodeComponent
  ],
  exports: [PrintReceiptModalComponent]
})
export class PrintReceiptModalModule { }
