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
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRow,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';

import { NewClientPageRoutingModule } from './new-client-routing.module';

import { NewClientPage } from './new-client.page';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCol, IonContent, IonFooter, IonGrid, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonLabel, IonList, IonModal, IonRow, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToggle, IonToolbar,
    NewClientPageRoutingModule
  ],
  declarations: [NewClientPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class NewClientPageModule {}
