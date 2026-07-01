import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ChartTrendPoint } from '../../dashboard-v2.service';

@Component({
  selector: 'app-sales-evolution-chart',
  templateUrl: './sales-evolution-chart.component.html',
  styleUrls: ['./sales-evolution-chart.component.scss']
})
export class SalesEvolutionChartComponent implements OnChanges {
  @Input() points: ChartTrendPoint[] = [];
  @Input() loading = false;
  @Input() granularity: 'month' | 'quarter' | 'year' = 'month';
  @Output() granularityChange = new EventEmitter<'month' | 'quarter' | 'year'>();

  chartData: ChartData<'line'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(Number(value))
        }
      }
    }
  };

  setGranularity(value: 'month' | 'quarter' | 'year'): void {
    this.granularityChange.emit(value);
  }

  ngOnChanges(): void {
    this.chartData = {
      labels: this.points.map(p => p.label),
      datasets: [
        {
          label: 'Crédits',
          data: this.points.map(p => p.sales),
          borderColor: '#003366',
          backgroundColor: 'rgba(0, 51, 102, 0.08)',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Recouvrements',
          data: this.points.map(p => p.collections),
          borderColor: '#0095c8',
          backgroundColor: 'rgba(0, 149, 200, 0.08)',
          tension: 0.35,
          fill: true
        }
      ]
    };
  }
}
