import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { NewLocalityPageRoutingModule } from './new-locality-routing.module';

import { NewLocalityPage } from './new-locality.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonFooter, IonHeader, IonInput, IonItem, IonLabel, IonTitle, IonToolbar,
    ReactiveFormsModule,
    NewLocalityPageRoutingModule
  ],
  declarations: [NewLocalityPage]
})
export class NewLocalityPageModule {}
