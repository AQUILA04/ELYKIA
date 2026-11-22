import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonRow,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TontineOrderReceiptModalComponent } from './tontine-order-receipt-modal.component';
import { ReceiptOrderLinesModule } from '../receipt-order-lines/receipt-order-lines.module';

@NgModule({
  declarations: [TontineOrderReceiptModalComponent],
  imports: [
    CommonModule,
    IonButton, IonButtons, IonCol, IonContent, IonFooter, IonGrid, IonHeader, IonIcon, IonRow, IonTitle, IonToolbar,
    ReceiptOrderLinesModule
  ],
  exports: [TontineOrderReceiptModalComponent]
})
export class TontineOrderReceiptModalModule { }
