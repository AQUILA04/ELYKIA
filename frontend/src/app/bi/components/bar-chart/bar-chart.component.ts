import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss']
})
export class BarChartComponent implements OnInit {
  @Input() chartData!: ChartData<'bar'>;
  @Input() chartOptions?: ChartConfiguration<'bar'>['options'];
  @Input() height: string = '300px';
  @Input() horizontal: boolean = false;
  
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public barChartType: ChartType = 'bar';
  public defaultOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('fr-FR').format(context.parsed.y) + ' FCFA';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: (value) => {
            return new Intl.NumberFormat('fr-FR', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value as number);
          }
        }
      }
    }
  };

  ngOnInit(): void {
    if (this.horizontal) {
      this.defaultOptions = {
        ...this.defaultOptions,
        indexAxis: 'y'
      };
    }
    
    if (!this.chartOptions) {
      this.chartOptions = this.defaultOptions;
    }
  }

  public updateChart(): void {
    this.chart?.update();
  }
}
