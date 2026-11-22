import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { SyncErrorDetailPageRoutingModule } from './sync-error-detail-routing.module';

import { SyncErrorDetailPage } from './sync-error-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonSkeletonText, IonTitle, IonToolbar,
    SyncErrorDetailPageRoutingModule
  ],
  declarations: [SyncErrorDetailPage]
})
export class SyncErrorDetailPageModule {}
