import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
// import { RecoverySummaryModalComponent } from './recovery-summary-modal.component';

@NgModule({
  // declarations: [RecoverySummaryModalComponent],
  imports: [
    IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar,
    CommonModule

  ],
  // exports: [RecoverySummaryModalComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RecoverySummaryModalModule { }
