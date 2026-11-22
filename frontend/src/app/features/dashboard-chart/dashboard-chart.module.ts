import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardChartComponent } from './dashboard-chart.component';

@NgModule({
  imports: [CommonModule, NgApexchartsModule, DashboardChartComponent],
  exports: [DashboardChartComponent]
})
export class DashboardChartModule {}
