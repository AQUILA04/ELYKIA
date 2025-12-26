import { Component, OnInit } from '@angular/core';
import { ChartData } from 'chart.js';
import { BiCollectionsService } from '../../services/bi-collections.service';
import { BiService } from '../../services/bi.service';
import { 
  CollectionMetrics, 
  CollectionTrend, 
  OverdueAnalysis,
  KpiCardData,
  PeriodType
} from '../../types/bi.types';

@Component({
  selector: 'app-bi-collections-dashboard',
  templateUrl: './bi-collections-dashboard.component.html',
  styleUrls: ['./bi-collections-dashboard.component.scss']
})
export class BiCollectionsDashboardComponent implements OnInit {
  loading: boolean = false;
  error: string | null = null;

  selectedPeriod: PeriodType = PeriodType.MONTH;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  collectionMetrics: CollectionMetrics | null = null;
  collectionTrends: CollectionTrend[] = [];
  overdueAnalysis: OverdueAnalysis[] = [];

  // KPI Cards
  collectedKpi: KpiCardData = {
    title: 'Montant Collecté',
    value: 0,
    evolution: 0,
    icon: 'payments',
    color: 'success',
    format: 'currency'
  };

  rateKpi: KpiCardData = {
    title: 'Taux de Recouvrement',
    value: 0,
    icon: 'percent',
    color: 'info',
    format: 'percentage'
  };

  onTimeKpi: KpiCardData = {
    title: 'Paiements à Temps',
    value: 0,
    icon: 'check_circle',
    color: 'success',
    format: 'number'
  };

  lateKpi: KpiCardData = {
    title: 'Paiements en Retard',
    value: 0,
    icon: 'schedule',
    color: 'danger',
    format: 'number'
  };

  // Charts
  collectionTrendChartData: ChartData<'line'> | null = null;
  overdueChartData: ChartData<'bar'> | null = null;

  constructor(
    private biCollectionsService: BiCollectionsService,
    private biService: BiService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    const filter = this.getPeriodFilter();

    this.biService.getCollectionMetrics(filter).subscribe({
      next: (metrics) => {
        this.collectionMetrics = metrics;
        this.updateKpiCards();
      },
      error: (err) => console.error('Erreur métriques:', err)
    });

    this.biCollectionsService.getCollectionTrends(filter).subscribe({
      next: (trends) => {
        this.collectionTrends = trends;
        this.updateCollectionTrendChart();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur tendances:', err);
        this.error = 'Impossible de charger les données';
        this.loading = false;
      }
    });

    this.biCollectionsService.getOverdueAnalysis().subscribe({
      next: (analysis) => {
        this.overdueAnalysis = analysis;
        this.updateOverdueChart();
      },
      error: (err) => console.error('Erreur retards:', err)
    });
  }

  selectPeriod(period: string): void {
    this.selectedPeriod = period as PeriodType;
    if (period !== 'CUSTOM') {
      this.customStartDate = null;
      this.customEndDate = null;
      this.loadData();
    }
  }

  onDateChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.loadData();
    }
  }

  private getPeriodFilter() {
    if (this.selectedPeriod === PeriodType.CUSTOM && this.customStartDate && this.customEndDate) {
      return {
        startDate: this.formatDate(this.customStartDate),
        endDate: this.formatDate(this.customEndDate)
      };
    }

    const today = new Date();
    let startDate: Date;

    switch (this.selectedPeriod) {
      case PeriodType.TODAY:
        startDate = today;
        break;
      case PeriodType.WEEK:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case PeriodType.MONTH:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case PeriodType.YEAR:
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(today)
    };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private updateKpiCards(): void {
    if (!this.collectionMetrics) return;

    this.collectedKpi.value = this.collectionMetrics.totalCollected;
    this.collectedKpi.evolution = this.collectionMetrics.evolution;

    this.rateKpi.value = this.collectionMetrics.collectionRate;

    this.onTimeKpi.value = this.collectionMetrics.onTimePaymentsCount;

    this.lateKpi.value = this.collectionMetrics.latePaymentsCount;
  }

  private updateCollectionTrendChart(): void {
    if (!this.collectionTrends.length) return;

    this.collectionTrendChartData = {
      labels: this.collectionTrends.map(t => this.formatDateLabel(t.date)),
      datasets: [
        {
          label: 'Collecté',
          data: this.collectionTrends.map(t => t.collected),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Attendu',
          data: this.collectionTrends.map(t => t.expected),
          borderColor: '#64748B',
          backgroundColor: 'rgba(100, 116, 139, 0.1)',
          tension: 0.4,
          fill: false,
          borderDash: [5, 5]
        }
      ]
    };
  }

  private updateOverdueChart(): void {
    if (!this.overdueAnalysis.length) return;

    this.overdueChartData = {
      labels: this.overdueAnalysis.map(a => a.range),
      datasets: [{
        label: 'Nombre de crédits',
        data: this.overdueAnalysis.map(a => a.creditsCount),
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#991B1B']
      }]
    };
  }

  private formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', { 
      day: '2-digit', 
      month: 'short' 
    }).format(date);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatPercentage(value: number): string {
    return value.toFixed(1) + '%';
  }
}
