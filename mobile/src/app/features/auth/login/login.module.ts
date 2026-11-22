import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { LoginPageRoutingModule } from './login-routing.module';

import { LogModalComponent } from 'src/app/shared/components/log-modal/log-modal.component';
import { LoginPage } from './login.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonButton, IonButtons, IonCard, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonTitle, IonToolbar,
    LoginPageRoutingModule
  ],
  declarations: [
    LoginPage,
    LogModalComponent]
})
export class LoginPageModule {}
