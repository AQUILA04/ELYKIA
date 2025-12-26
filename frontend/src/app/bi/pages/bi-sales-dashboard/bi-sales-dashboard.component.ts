import { Component, OnInit } from '@angular/core';
import { ChartData } from 'chart.js';
import { BiSalesService } from '../../services/bi-sales.service';
import { BiService } from '../../services/bi.service';
import { 
  SalesMetrics, 
  SalesTrend, 
  CommercialPerformance, 
  ArticlePerformance,
  KpiCardData,
  PeriodType,
  SalesFilter
} from '../../types/bi.types';

@Component({
  selector: 'app-bi-sales-dashboard',
  templateUrl: './bi-sales-dashboard.component.html',
  styleUrls: ['./bi-sales-dashboard.component.scss']
})
export class BiSalesDashboardComponent implements OnInit {
  loading: boolean = false;
  error: string | null = null;

  // Period selection
  selectedPeriod: PeriodType = PeriodType.MONTH;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  // Filters
  selectedCollector: string = '';
  selectedClientType: string = '';
  collectors: string[] = [];

  // Data
  salesMetrics: SalesMetrics | null = null;
  salesTrends: SalesTrend[] = [];
  commercialPerformance: CommercialPerformance[] = [];
  articlePerformance: ArticlePerformance[] = [];

  // KPI Cards
  salesKpi: KpiCardData = {
    title: 'Chiffre d\'Affaires',
    value: 0,
    evolution: 0,
    icon: 'trending_up',
    color: 'primary',
    format: 'currency'
  };

  profitKpi: KpiCardData = {
    title: 'Marge Brute',
    value: 0,
    evolution: 0,
    icon: 'account_balance_wallet',
    color: 'success',
    format: 'currency'
  };

  volumeKpi: KpiCardData = {
    title: 'Volume de Ventes',
    value: 0,
    icon: 'shopping_cart',
    color: 'info',
    format: 'number'
  };

  avgSaleKpi: KpiCardData = {
    title: 'Panier Moyen',
    value: 0,
    icon: 'receipt',
    color: 'warning',
    format: 'currency'
  };

  // Charts Data
  salesTrendChartData: ChartData<'line'> | null = null;
  commercialChartData: ChartData<'bar'> | null = null;
  articleChartData: ChartData<'bar'> | null = null;

  constructor(
    private biSalesService: BiSalesService,
    private biService: BiService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Charge toutes les données
   */
  loadData(): void {
    this.loading = true;
    this.error = null;

    const filter = this.getFilter();

    // Charger les métriques
    this.biService.getSalesMetrics(filter).subscribe({
      next: (metrics) => {
        this.salesMetrics = metrics;
        this.updateKpiCards();
      },
      error: (err) => {
        console.error('Erreur métriques:', err);
      }
    });

    // Charger les tendances
    this.biSalesService.getSalesTrends(filter).subscribe({
      next: (trends) => {
        this.salesTrends = trends;
        this.updateSalesTrendChart();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur tendances:', err);
        this.error = 'Impossible de charger les données';
        this.loading = false;
      }
    });

    // Charger performance commerciaux
    this.biSalesService.getCommercialPerformance(filter).subscribe({
      next: (performance) => {
        this.commercialPerformance = performance;
        this.updateCommercialChart();
        this.extractCollectors();
      },
      error: (err) => {
        console.error('Erreur commerciaux:', err);
      }
    });

    // Charger performance articles
    this.biSalesService.getArticlePerformance(filter).subscribe({
      next: (performance) => {
        this.articlePerformance = performance;
        this.updateArticleChart();
      },
      error: (err) => {
        console.error('Erreur articles:', err);
      }
    });
  }

  /**
   * Sélectionne une période
   */
  selectPeriod(period: string): void {
    this.selectedPeriod = period as PeriodType;
    if (period !== 'CUSTOM') {
      this.customStartDate = null;
      this.customEndDate = null;
      this.loadData();
    }
  }

  /**
   * Gère le changement de date personnalisée
   */
  onDateChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.loadData();
    }
  }

  /**
   * Applique les filtres
   */
  applyFilters(): void {
    this.loadData();
  }

  /**
   * Réinitialise les filtres
   */
  resetFilters(): void {
    this.selectedCollector = '';
    this.selectedClientType = '';
    this.loadData();
  }

  /**
   * Retourne le filtre actuel
   */
  private getFilter(): SalesFilter {
    const filter: SalesFilter = this.getPeriodFilter();
    
    if (this.selectedCollector) {
      filter.collector = this.selectedCollector;
    }
    
    if (this.selectedClientType) {
      filter.clientType = this.selectedClientType as any;
    }
    
    return filter;
  }

  /**
   * Retourne le filtre de période
   */
  private getPeriodFilter(): SalesFilter {
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

  /**
   * Formate une date
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Met à jour les KPI cards
   */
  private updateKpiCards(): void {
    if (!this.salesMetrics) return;

    this.salesKpi.value = this.salesMetrics.totalAmount;
    this.salesKpi.evolution = this.salesMetrics.evolution;
    this.salesKpi.subtitle = `${this.salesMetrics.count} vente(s)`;

    this.profitKpi.value = this.salesMetrics.totalProfit;
    this.profitKpi.evolution = this.salesMetrics.evolution;
    this.profitKpi.subtitle = `Marge: ${this.salesMetrics.profitMargin.toFixed(1)}%`;

    this.volumeKpi.value = this.salesMetrics.count;

    this.avgSaleKpi.value = this.salesMetrics.averageSaleAmount;
  }

  /**
   * Met à jour le graphique des tendances
   */
  private updateSalesTrendChart(): void {
    if (!this.salesTrends.length) return;

    this.salesTrendChartData = {
      labels: this.salesTrends.map(t => this.formatDateLabel(t.date)),
      datasets: [
        {
          label: 'Chiffre d\'affaires',
          data: this.salesTrends.map(t => t.totalAmount),
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Marge',
          data: this.salesTrends.map(t => t.totalProfit),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }

  /**
   * Met à jour le graphique des commerciaux
   */
  private updateCommercialChart(): void {
    if (!this.commercialPerformance.length) return;

    const top10 = this.commercialPerformance.slice(0, 10);

    this.commercialChartData = {
      labels: top10.map(c => c.collector),
      datasets: [{
        label: 'Chiffre d\'affaires',
        data: top10.map(c => c.totalSalesAmount),
        backgroundColor: '#2563EB'
      }]
    };
  }

  /**
   * Met à jour le graphique des articles
   */
  private updateArticleChart(): void {
    if (!this.articlePerformance.length) return;

    const top10 = this.articlePerformance.slice(0, 10);

    this.articleChartData = {
      labels: top10.map(a => a.articleName.substring(0, 30)),
      datasets: [{
        label: 'Chiffre d\'affaires',
        data: top10.map(a => a.totalRevenue),
        backgroundColor: '#10B981'
      }]
    };
  }

  /**
   * Extrait la liste des commerciaux
   */
  private extractCollectors(): void {
    this.collectors = [...new Set(this.commercialPerformance.map(c => c.collector))];
  }

  /**
   * Formate un label de date
   */
  private formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', { 
      day: '2-digit', 
      month: 'short' 
    }).format(date);
  }

  /**
   * Formate un montant
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  }

  /**
   * Formate un nombre
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  /**
   * Formate un pourcentage
   */
  formatPercentage(value: number): string {
    return value.toFixed(1) + '%';
  }
}
