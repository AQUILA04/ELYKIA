import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';

import { RecoveryClientListPageRoutingModule } from './recovery-client-list-routing.module';

import { RecoveryClientListPage } from './recovery-client-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonBackButton, IonButtons, IonContent, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonSearchbar, IonSpinner, IonToolbar,
    RecoveryClientListPageRoutingModule
  ],
  declarations: [RecoveryClientListPage]
})
export class RecoveryClientListPageModule {}
