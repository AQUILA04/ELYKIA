import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DistributionsPageRoutingModule } from './distributions-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    DistributionsPageRoutingModule
  ],
  declarations: []
})
export class DistributionsPageModule {}
