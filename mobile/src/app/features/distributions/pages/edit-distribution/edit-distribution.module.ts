import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { EditDistributionPageRoutingModule } from './edit-distribution-routing.module';
import { EditDistributionPage } from './edit-distribution.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    EditDistributionPageRoutingModule,
    ScrollingModule
  ],
  declarations: [
    EditDistributionPage
  ]
})
export class EditDistributionPageModule {}