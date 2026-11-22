import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { SyncErrorListPageRoutingModule } from './sync-error-list-routing.module';

import { SyncErrorListPage } from './sync-error-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText, IonTitle, IonToolbar,
    SyncErrorListPageRoutingModule
  ],
  declarations: [SyncErrorListPage]
})
export class SyncErrorListPageModule {}
