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
import { TontineDeliveryReceiptModalComponent } from './tontine-delivery-receipt-modal.component';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';

@NgModule({
    declarations: [TontineDeliveryReceiptModalComponent],
    imports: [
        CommonModule,
        IonButton, IonButtons, IonCol, IonContent, IonFooter, IonGrid, IonHeader, IonIcon, IonRow, IonTitle, IonToolbar,
        IfUnitPriceDirective
    ],
    exports: [TontineDeliveryReceiptModalComponent]
})
export class TontineDeliveryReceiptModalModule { }
