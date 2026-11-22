import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular';

import { SyncManualPageRoutingModule } from './sync-manual-routing.module';
import { SyncManualPage } from './sync-manual.page';
import { EntitySyncListComponent } from '../components/entity-sync-list/entity-sync-list.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonBadge, IonButton, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonSpinner,
    SyncManualPageRoutingModule
  ],
  declarations: [
    SyncManualPage,
    EntitySyncListComponent
  ]
})
export class SyncManualPageModule {}
