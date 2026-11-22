import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { LocationUpdateComponent } from './location-update.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonTitle, IonToggle, IonToolbar,
  ],
  declarations: [LocationUpdateComponent],
  exports: [LocationUpdateComponent]
})
export class LocationUpdateModule {}
