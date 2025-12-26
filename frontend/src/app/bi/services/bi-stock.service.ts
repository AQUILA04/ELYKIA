import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  StockAlert,
  StockAnalytics
} from '../types/bi.types';

@Injectable({
  providedIn: 'root'
})
export class BiStockService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/bi/stock`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère toutes les alertes de stock
   */
  getAllStockAlerts(): Observable<StockAlert[]> {
    return this.http.get<ApiResponse<StockAlert[]>>(
      `${this.apiUrl}/alerts`
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère les articles en rupture de stock
   */
  getOutOfStockItems(): Observable<StockAlert[]> {
    return this.http.get<ApiResponse<StockAlert[]>>(
      `${this.apiUrl}/out-of-stock`
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère les articles en stock faible
   */
  getLowStockItems(): Observable<StockAlert[]> {
    return this.http.get<ApiResponse<StockAlert[]>>(
      `${this.apiUrl}/low-stock`
    ).pipe(map(response => response.data));
  }

  /**
   * Récupère l'analyse complète du stock
   */
  getStockAnalytics(): Observable<StockAnalytics[]> {
    return this.http.get<ApiResponse<StockAnalytics[]>>(
      `${this.apiUrl}/analytics`
    ).pipe(map(response => response.data));
  }
}
