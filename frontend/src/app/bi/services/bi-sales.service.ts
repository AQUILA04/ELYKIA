import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  SalesFilter,
  SalesTrend,
  CommercialPerformance,
  ArticlePerformance
} from '../types/bi.types';

@Injectable({
  providedIn: 'root'
})
export class BiSalesService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/bi/sales`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère les tendances des ventes par jour
   */
  getSalesTrends(filter?: SalesFilter): Observable<SalesTrend[]> {
    const params = this.buildSalesParams(filter);
    return this.http.get<ApiResponse<SalesTrend[]>>(
      `${this.apiUrl}/trends`,
      { params }
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère la performance des commerciaux
   */
  getCommercialPerformance(filter?: SalesFilter): Observable<CommercialPerformance[]> {
    const params = this.buildSalesParams(filter);
    return this.http.get<ApiResponse<CommercialPerformance[]>>(
      `${this.apiUrl}/by-commercial`,
      { params }
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère la performance des articles
   */
  getArticlePerformance(filter?: SalesFilter): Observable<ArticlePerformance[]> {
    const params = this.buildSalesParams(filter);
    return this.http.get<ApiResponse<ArticlePerformance[]>>(
      `${this.apiUrl}/by-article`,
      { params }
    ).pipe(map(response => response.data));
  }

  /**
   * Construit les paramètres HTTP pour les filtres de ventes
   */
  private buildSalesParams(filter?: SalesFilter): HttpParams {
    let params = new HttpParams();

    if (filter?.startDate) {
      params = params.set('startDate', filter.startDate);
    }

    if (filter?.endDate) {
      params = params.set('endDate', filter.endDate);
    }

    if (filter?.collector) {
      params = params.set('collector', filter.collector);
    }

    if (filter?.clientType) {
      params = params.set('clientType', filter.clientType);
    }

    if (filter?.status) {
      params = params.set('status', filter.status);
    }

    if (filter?.zone) {
      params = params.set('zone', filter.zone);
    }

    return params;
  }
}
