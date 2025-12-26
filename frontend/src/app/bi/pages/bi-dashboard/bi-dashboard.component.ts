import { Component, OnInit } from '@angular/core';
import { BiService } from '../../services/bi.service';
import { DashboardOverview, KpiCardData, PeriodType } from '../../types/bi.types';

@Component({
  selector: 'app-bi-dashboard',
  templateUrl: './bi-dashboard.component.html',
  styleUrls: ['./bi-dashboard.component.scss']
})
export class BiDashboardComponent implements OnInit {
  loading: boolean = false;
  error: string | null = null;
  overview: DashboardOverview | null = null;

  // Period selection
  selectedPeriod: PeriodType = PeriodType.MONTH;
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  // KPI Cards Data
  salesKpi: KpiCardData = {
    title: 'Chiffre d\'affaires',
    value: 0,
    evolution: 0,
    icon: 'trending_up',
    color: 'primary',
    format: 'currency'
  };

  profitKpi: KpiCardData = {
    title: 'Marge brute',
    value: 0,
    evolution: 0,
    icon: 'account_balance_wallet',
    color: 'success',
    format: 'currency'
  };

  collectionKpi: KpiCardData = {
    title: 'Encaissements',
    value: 0,
    evolution: 0,
    icon: 'payments',
    color: 'info',
    format: 'currency'
  };

  stockKpi: KpiCardData = {
    title: 'Stock total',
    value: 0,
    evolution: 0,
    icon: 'inventory',
    color: 'warning',
    format: 'currency'
  };

  constructor(private biService: BiService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  /**
   * Charge les données du dashboard
   */
  loadDashboard(): void {
    this.loading = true;
    this.error = null;

    const filter = this.getPeriodFilter();

    this.biService.getDashboardOverview(filter).subscribe({
      next: (data) => {
        this.overview = data;
        this.updateKpiCards();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du dashboard:', err);
        this.error = 'Impossible de charger les données du dashboard. Veuillez réessayer.';
        this.loading = false;
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
      this.loadDashboard();
    }
  }

  /**
   * Gère le changement de date personnalisée
   */
  onDateChange(): void {
    if (this.customStartDate && this.customEndDate) {
      this.loadDashboard();
    }
  }

  /**
   * Retourne le filtre de période
   */
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

  /**
   * Formate une date au format YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Met à jour les cartes KPI avec les données du dashboard
   */
  private updateKpiCards(): void {
    if (!this.overview) return;

    this.salesKpi = {
      ...this.salesKpi,
      value: this.overview.sales.totalAmount,
      evolution: this.overview.sales.evolution,
      subtitle: `${this.overview.sales.count} vente(s)`
    };

    this.profitKpi = {
      ...this.profitKpi,
      value: this.overview.sales.totalProfit,
      evolution: this.overview.sales.evolution,
      subtitle: `Marge: ${this.overview.sales.profitMargin.toFixed(1)}%`
    };

    this.collectionKpi = {
      ...this.collectionKpi,
      value: this.overview.collections.totalCollected,
      evolution: this.overview.collections.evolution,
      subtitle: `Taux: ${this.overview.collections.collectionRate.toFixed(1)}%`
    };

    this.stockKpi = {
      ...this.stockKpi,
      value: this.overview.stock.totalValue,
      subtitle: `${this.overview.stock.itemsCount} article(s)`
    };
  }

  /**
   * Retourne la classe CSS pour l'alerte de recouvrement
   */
  getCollectionAlertClass(): string {
    if (!this.overview) return 'alert-card--info';
    const rate = this.overview.collections.collectionRate;
    if (rate >= 75) return 'alert-card--success';
    if (rate >= 50) return 'alert-card--warning';
    return 'alert-card--error';
  }

  /**
   * Retourne la classe CSS pour l'icône de recouvrement
   */
  getCollectionIconClass(): string {
    if (!this.overview) return 'alert-card__icon--info';
    const rate = this.overview.collections.collectionRate;
    if (rate >= 75) return 'alert-card__icon--success';
    if (rate >= 50) return 'alert-card__icon--warning';
    return 'alert-card__icon--error';
  }

  /**
   * Retourne l'icône pour l'alerte de recouvrement
   */
  getCollectionIcon(): string {
    if (!this.overview) return 'info';
    const rate = this.overview.collections.collectionRate;
    if (rate >= 75) return 'check_circle';
    if (rate >= 50) return 'warning';
    return 'error';
  }

  /**
   * Formate un montant en devise
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' FCFA';
  }
}
