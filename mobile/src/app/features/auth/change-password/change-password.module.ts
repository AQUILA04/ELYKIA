import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ChangePasswordPageRoutingModule } from './change-password-routing.module';
import { ChangePasswordPage } from './change-password.page';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonBackButton, IonButton, IonButtons, IonCard, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonTitle, IonToolbar,
    ChangePasswordPageRoutingModule,
  ],
  declarations: [ChangePasswordPage],
})
export class ChangePasswordPageModule {}
