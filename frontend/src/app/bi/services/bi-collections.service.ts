import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  CollectionFilter,
  CollectionTrend,
  OverdueAnalysis,
  SolvencyDistribution
} from '../types/bi.types';

@Injectable({
  providedIn: 'root'
})
export class BiCollectionsService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/bi/collections`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère les tendances des encaissements
   */
  getCollectionTrends(filter?: CollectionFilter): Observable<CollectionTrend[]> {
    const params = this.buildCollectionParams(filter);
    return this.http.get<ApiResponse<CollectionTrend[]>>(
      `${this.apiUrl}/trends`,
      { params }
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère l'analyse des retards par tranche
   */
  getOverdueAnalysis(): Observable<OverdueAnalysis[]> {
    return this.http.get<ApiResponse<OverdueAnalysis[]>>(
      `${this.apiUrl}/overdue-analysis`
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère la distribution de solvabilité
   */
  getSolvencyDistribution(): Observable<SolvencyDistribution[]> {
    return this.http.get<ApiResponse<SolvencyDistribution[]>>(
      `${this.apiUrl}/solvency-distribution`
    ).pipe(map(response => response.data));
  }

  /**
   * Construit les paramètres HTTP pour les filtres de recouvrement
   */
  private buildCollectionParams(filter?: CollectionFilter): HttpParams {
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

    if (filter?.solvencyNote) {
      params = params.set('solvencyNote', filter.solvencyNote);
    }

    if (filter?.riskLevel) {
      params = params.set('riskLevel', filter.riskLevel);
    }

    return params;
  }
}
