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
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { MemberRegistrationPage } from './member-registration.page';
import { SharedModule } from 'src/app/shared/shared.module';

const routes: Routes = [
    {
        path: '',
        component: MemberRegistrationPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonRadio, IonRadioGroup, IonTextarea, IonTitle, IonToolbar,
        SharedModule,
        RouterModule.forChild(routes)
    ],
    declarations: [MemberRegistrationPage]
})
export class MemberRegistrationPageModule { }
