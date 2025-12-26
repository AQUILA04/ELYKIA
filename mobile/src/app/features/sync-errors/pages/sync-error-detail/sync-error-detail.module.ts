import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SyncErrorDetailPageRoutingModule } from './sync-error-detail-routing.module';

import { SyncErrorDetailPage } from './sync-error-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SyncErrorDetailPageRoutingModule
  ],
  declarations: [SyncErrorDetailPage]
})
export class SyncErrorDetailPageModule {}
