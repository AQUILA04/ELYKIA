import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToggle,
} from '@ionic/angular';

import { MorePageRoutingModule } from './more-routing.module';

import { MorePage } from './more.page';

import { InitialsPipe } from '../../shared/pipes/initials.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonButton, IonContent, IonIcon, IonSelect, IonSelectOption, IonSpinner, IonToggle,
    MorePageRoutingModule,
    InitialsPipe
  ],
  declarations: [MorePage]
})
export class MorePageModule {}
