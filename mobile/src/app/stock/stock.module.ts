import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StockRoutingModule } from './stock-routing.module';
import { StockDashboardComponent } from './dashboard/stock-dashboard.component';

@NgModule({
  declarations: [
    StockDashboardComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    StockRoutingModule
  ]
})
export class StockModule { }
