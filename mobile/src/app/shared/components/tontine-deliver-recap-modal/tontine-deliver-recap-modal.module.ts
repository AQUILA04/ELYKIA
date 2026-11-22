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
import { TontineDeliverRecapModalComponent } from './tontine-deliver-recap-modal.component';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';

@NgModule({
  declarations: [TontineDeliverRecapModalComponent],
  imports: [
    CommonModule,
    IonButton, IonButtons, IonCol, IonContent, IonFooter, IonGrid, IonHeader, IonIcon, IonRow, IonTitle, IonToolbar,
    IfUnitPriceDirective
  ],
  exports: [TontineDeliverRecapModalComponent]
})
export class TontineDeliverRecapModalModule { }
