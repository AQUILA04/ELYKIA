import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { PrintReceiptModalComponent } from './print-receipt-modal.component';
import { QRCodeComponent } from 'angularx-qrcode';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';
import { IfNoUnitPriceDirective } from '../../directives/if-no-unit-price.directive';

@NgModule({
  declarations: [PrintReceiptModalComponent],
  imports: [
    CommonModule,
    IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonTitle, IonToolbar,
    QRCodeComponent,
    IfUnitPriceDirective,
    IfNoUnitPriceDirective
  ],
  exports: [PrintReceiptModalComponent]
})
export class PrintReceiptModalModule { }
