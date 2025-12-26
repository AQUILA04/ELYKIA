import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  DashboardOverview,
  PeriodFilter,
  SalesMetrics,
  CollectionMetrics,
  StockMetrics,
  PortfolioMetrics
} from '../types/bi.types';

@Injectable({
  providedIn: 'root'
})
export class BiService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/bi`;

  constructor(private http: HttpClient) {}

  // ============================================================================
  // DASHBOARD PRINCIPAL
  // ============================================================================

  /**
   * Récupère la vue d'ensemble complète du dashboard
   */
  getDashboardOverview(filter?: PeriodFilter): Observable<DashboardOverview> {
    const params = this.buildPeriodParams(filter);
    return this.http.get<ApiResponse<DashboardOverview>>(
      `${this.apiUrl}/dashboard/overview`,
      { params }
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère les métriques de ventes
   */
  getSalesMetrics(filter?: PeriodFilter): Observable<SalesMetrics> {
    const params = this.buildPeriodParams(filter);
    return this.http.get<ApiResponse<SalesMetrics>>(
      `${this.apiUrl}/dashboard/sales/metrics`,
      { params }
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère les métriques de recouvrement
   */
  getCollectionMetrics(filter?: PeriodFilter): Observable<CollectionMetrics> {
    const params = this.buildPeriodParams(filter);
    return this.http.get<ApiResponse<CollectionMetrics>>(
      `${this.apiUrl}/dashboard/collections/metrics`,
      { params }
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère les métriques de stock
   */
  getStockMetrics(): Observable<StockMetrics> {
    return this.http.get<ApiResponse<StockMetrics>>(
      `${this.apiUrl}/dashboard/stock/metrics`
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère les métriques du portefeuille
   */
  getPortfolioMetrics(): Observable<PortfolioMetrics> {
    return this.http.get<ApiResponse<PortfolioMetrics>>(
      `${this.apiUrl}/dashboard/portfolio/metrics`
    ).pipe(map(response => response.data));
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  /**
   * Construit les paramètres HTTP pour les filtres de période
   */
  private buildPeriodParams(filter?: PeriodFilter): HttpParams {
    let params = new HttpParams();

    if (filter?.startDate) {
      params = params.set('startDate', filter.startDate);
    }

    if (filter?.endDate) {
      params = params.set('endDate', filter.endDate);
    }

    return params;
  }

  /**
   * Formate un nombre en devise FCFA
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' FCFA';
  }

  /**
   * Formate un pourcentage
   */
  formatPercentage(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  /**
   * Formate un nombre
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
