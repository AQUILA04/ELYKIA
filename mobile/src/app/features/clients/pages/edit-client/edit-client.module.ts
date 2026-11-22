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
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';

import { EditClientPageRoutingModule } from './edit-client-routing.module';

import { EditClientPage } from './edit-client.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonLabel, IonList, IonModal, IonNote, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToggle, IonToolbar,
    EditClientPageRoutingModule
  ],
  declarations: [EditClientPage]
})
export class EditClientPageModule {}
