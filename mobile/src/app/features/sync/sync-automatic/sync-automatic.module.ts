import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SyncAutomaticPageRoutingModule } from './sync-automatic-routing.module';
import { SyncAutomaticPage } from './sync-automatic.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SyncAutomaticPageRoutingModule,
    SyncAutomaticPage
  ]
})
export class SyncAutomaticPageModule {}