import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StockRoutingModule } from './stock-routing.module';
import { StockDashboardComponent } from './dashboard/stock-dashboard.component';

import { RequestListComponent } from './components/request-list/request-list.component';
import { StockReturnListComponent } from './components/return-list/stock-return-list.component';
import { StockDetailModalComponent } from './components/detail-modal/stock-detail-modal.component';
import { StockTontineRequestFormComponent } from './components/tontine-request-form/stock-tontine-request-form.component';
import { StockTontineReturnFormComponent } from './components/tontine-return-form/stock-tontine-return-form.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    StockDashboardComponent,
    RequestListComponent,
    StockReturnListComponent,
    StockDetailModalComponent,
    StockTontineRequestFormComponent,
    StockTontineReturnFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StockRoutingModule
  ],
  exports: [
    RequestListComponent,
    StockReturnListComponent
  ]
})
export class StockModule { }

