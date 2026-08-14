import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardChartComponent } from './dashboard-chart.component';

@NgModule({
  declarations: [DashboardChartComponent],
  imports: [CommonModule, NgApexchartsModule],
  exports: [DashboardChartComponent]
})
export class DashboardChartModule {}
