import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NewLocalityPageRoutingModule } from './new-locality-routing.module';

import { NewLocalityPage } from './new-locality.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    NewLocalityPageRoutingModule
  ],
  declarations: [NewLocalityPage]
})
export class NewLocalityPageModule {}
