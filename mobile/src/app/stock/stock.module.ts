import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StockRoutingModule } from './stock-routing.module';
import { StockDashboardComponent } from './dashboard/stock-dashboard.component';

import { RequestListComponent } from './components/request-list/request-list.component';
import { StockReturnListComponent } from './components/return-list/stock-return-list.component';

@NgModule({
  declarations: [
    StockDashboardComponent,
    RequestListComponent,
    StockReturnListComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    StockRoutingModule
  ],
  exports: [
    RequestListComponent,
    StockReturnListComponent
  ]
})
export class StockModule { }

