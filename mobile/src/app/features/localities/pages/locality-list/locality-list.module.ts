import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LocalityListPageRoutingModule } from './locality-list-routing.module';

import { LocalityListPage } from './locality-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LocalityListPageRoutingModule
  ],
  declarations: [LocalityListPage]
})
export class LocalityListPageModule {}
