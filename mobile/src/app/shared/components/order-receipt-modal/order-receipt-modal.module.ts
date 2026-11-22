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
import { OrderReceiptModalComponent } from './order-receipt-modal.component';
import { ReceiptOrderLinesModule } from '../receipt-order-lines/receipt-order-lines.module';

@NgModule({
  declarations: [OrderReceiptModalComponent],
  imports: [
    CommonModule,
    IonButton, IonButtons, IonCol, IonContent, IonFooter, IonGrid, IonHeader, IonIcon, IonRow, IonTitle, IonToolbar,
    ReceiptOrderLinesModule
  ],
  exports: [OrderReceiptModalComponent]
})
export class OrderReceiptModalModule { }
