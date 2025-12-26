import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InitialLoadingPageRoutingModule } from './initial-loading-routing.module';

import { InitialLoadingPage } from './initial-loading.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InitialLoadingPageRoutingModule
  ],
  declarations: [InitialLoadingPage]
})
export class InitialLoadingPageModule {}
