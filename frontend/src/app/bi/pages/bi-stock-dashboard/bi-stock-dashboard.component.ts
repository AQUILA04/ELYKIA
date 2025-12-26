import { Component, OnInit } from '@angular/core';
import { BiStockService } from '../../services/bi-stock.service';
import { BiService } from '../../services/bi.service';
import { StockMetrics, StockAlert, KpiCardData } from '../../types/bi.types';

@Component({
  selector: 'app-bi-stock-dashboard',
  templateUrl: './bi-stock-dashboard.component.html',
  styleUrls: ['./bi-stock-dashboard.component.scss']
})
export class BiStockDashboardComponent implements OnInit {
  loading: boolean = false;
  error: string | null = null;

  stockMetrics: StockMetrics | null = null;
  stockAlerts: StockAlert[] = [];
  outOfStockItems: StockAlert[] = [];
  lowStockItems: StockAlert[] = [];

  // KPI Cards
  valueKpi: KpiCardData = {
    title: 'Valeur Totale Stock',
    value: 0,
    icon: 'inventory',
    color: 'primary',
    format: 'currency'
  };

  itemsKpi: KpiCardData = {
    title: 'Nombre d\'Articles',
    value: 0,
    icon: 'category',
    color: 'info',
    format: 'number'
  };

  outOfStockKpi: KpiCardData = {
    title: 'Ruptures de Stock',
    value: 0,
    icon: 'error',
    color: 'danger',
    format: 'number'
  };

  lowStockKpi: KpiCardData = {
    title: 'Stock Faible',
    value: 0,
    icon: 'warning',
    color: 'warning',
    format: 'number'
  };

  constructor(
    private biStockService: BiStockService,
    private biService: BiService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.biService.getStockMetrics().subscribe({
      next: (metrics) => {
        this.stockMetrics = metrics;
        this.updateKpiCards();
      },
      error: (err) => console.error('Erreur métriques:', err)
    });

    this.biStockService.getAllStockAlerts().subscribe({
      next: (alerts) => {
        this.stockAlerts = alerts;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur alertes:', err);
        this.error = 'Impossible de charger les données';
        this.loading = false;
      }
    });

    this.biStockService.getOutOfStockItems().subscribe({
      next: (items) => {
        this.outOfStockItems = items;
      },
      error: (err) => console.error('Erreur ruptures:', err)
    });

    this.biStockService.getLowStockItems().subscribe({
      next: (items) => {
        this.lowStockItems = items;
      },
      error: (err) => console.error('Erreur stock faible:', err)
    });
  }

  private updateKpiCards(): void {
    if (!this.stockMetrics) return;

    this.valueKpi.value = this.stockMetrics.totalValue;
    this.itemsKpi.value = this.stockMetrics.itemsCount;
    this.outOfStockKpi.value = this.stockMetrics.outOfStockCount;
    this.lowStockKpi.value = this.stockMetrics.lowStockCount;
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      default: return 'low';
    }
  }

  getUrgencyLabel(urgency: string): string {
    switch (urgency) {
      case 'CRITICAL': return 'Critique';
      case 'HIGH': return 'Élevé';
      case 'MEDIUM': return 'Moyen';
      default: return 'Faible';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }
}
