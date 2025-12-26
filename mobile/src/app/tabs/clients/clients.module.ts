import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ClientsPage } from './clients.page';
import { ExploreContainerComponentModule } from '../../explore-container/explore-container.module';

import { ClientsPageRoutingModule } from './clients-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ExploreContainerComponentModule,
    ClientsPageRoutingModule,
    ScrollingModule
  ],
  declarations: [ClientsPage]
})
export class ClientsPageModule {}