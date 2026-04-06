import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SyncManualPageRoutingModule } from './sync-manual-routing.module';
import { SyncManualPage } from './sync-manual.page';
import { EntitySyncListComponent } from '../components/entity-sync-list/entity-sync-list.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SyncManualPageRoutingModule
  ],
  declarations: [
    SyncManualPage,
    EntitySyncListComponent
  ]
})
export class SyncManualPageModule {}
