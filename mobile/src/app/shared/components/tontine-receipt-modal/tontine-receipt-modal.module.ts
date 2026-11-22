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
import { TontineReceiptModalComponent } from './tontine-receipt-modal.component';

@NgModule({
    declarations: [TontineReceiptModalComponent],
    imports: [
        CommonModule,
        IonButton, IonButtons, IonCol, IonContent, IonFooter, IonGrid, IonHeader, IonIcon, IonRow, IonTitle, IonToolbar
    ],
    exports: [TontineReceiptModalComponent]
})
export class TontineReceiptModalModule { }
