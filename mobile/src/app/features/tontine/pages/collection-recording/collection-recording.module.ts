import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonSearchbar,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { CollectionRecordingPage } from './collection-recording.page';
import { TontineReceiptModalModule } from 'src/app/shared/components/tontine-receipt-modal/tontine-receipt-modal.module';

const routes: Routes = [
    {
        path: '',
        component: CollectionRecordingPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonSearchbar, IonSpinner, IonTextarea, IonTitle, IonToolbar,
        RouterModule.forChild(routes),
        TontineReceiptModalModule
    ],
    declarations: [CollectionRecordingPage]
})
export class CollectionRecordingPageModule { }
