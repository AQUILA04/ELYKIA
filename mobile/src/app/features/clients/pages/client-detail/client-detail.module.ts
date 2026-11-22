import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';

import { ClientDetailPageRoutingModule } from './client-detail-routing.module';
import { ComponentsModule } from '../../components/components.module';

import { ClientDetailPage } from './client-detail.page';
import { ImagePreviewComponentModule } from 'src/app/shared/components/image-preview/image-preview.module';
import { LocationUpdateModule } from 'src/app/shared/components/location-update/location-update.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton, IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonLabel, IonList, IonProgressBar, IonSegment, IonSegmentButton, IonTitle, IonToggle, IonToolbar,
    ClientDetailPageRoutingModule,
    ComponentsModule,
    ImagePreviewComponentModule,
    LocationUpdateModule,
  ],
  declarations: [ClientDetailPage],
  providers: [
    DatePipe,
  ]
})
export class ClientDetailPageModule {}
