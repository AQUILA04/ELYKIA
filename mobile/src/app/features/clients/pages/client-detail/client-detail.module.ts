import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ClientDetailPageRoutingModule } from './client-detail-routing.module';
import { ComponentsModule } from '../../components/components.module';

import { ClientDetailPage } from './client-detail.page';
import { ImagePreviewComponentModule } from 'src/app/shared/components/image-preview/image-preview.module';
import { LocationUpdateComponent } from 'src/app/shared/components/location-update/location-update.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClientDetailPageRoutingModule,
    ComponentsModule,
    ImagePreviewComponentModule,
  ],
  declarations: [ClientDetailPage, LocationUpdateComponent],
  providers: [
    DatePipe,
  ]
})
export class ClientDetailPageModule {}
