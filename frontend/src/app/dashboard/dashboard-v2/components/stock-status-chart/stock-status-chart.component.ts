import { Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DashboardV2StockKpi } from '../../dashboard-v2.service';

@Component({
  selector: 'app-stock-status-chart',
  templateUrl: './stock-status-chart.component.html',
  styleUrls: ['./stock-status-chart.component.scss']
})
export class StockStatusChartComponent implements OnChanges {
  @Input() stock!: DashboardV2StockKpi | null;
  @Input() loading = false;

  chartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'right' }
    }
  };

  ngOnChanges(): void {
    const donut = this.stock?.donut ?? { inStock: 0, lowStock: 0, outOfStock: 0 };
    this.chartData = {
      labels: ['En stock', 'Faible stock', 'Rupture'],
      datasets: [{
        data: [donut.inStock, donut.lowStock, donut.outOfStock],
        backgroundColor: ['#003366', '#0095c8', '#dc2626'],
        borderWidth: 0
      }]
    };
  }
}
