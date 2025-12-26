import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SyncErrorListPageRoutingModule } from './sync-error-list-routing.module';

import { SyncErrorListPage } from './sync-error-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SyncErrorListPageRoutingModule
  ],
  declarations: [SyncErrorListPage]
})
export class SyncErrorListPageModule {}
