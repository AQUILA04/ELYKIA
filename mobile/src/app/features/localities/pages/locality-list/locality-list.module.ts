import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { LocalityListPageRoutingModule } from './locality-list-routing.module';

import { LocalityListPage } from './locality-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent, IonSpinner, IonTitle, IonToolbar,
    LocalityListPageRoutingModule
  ],
  declarations: [LocalityListPage]
})
export class LocalityListPageModule {}
