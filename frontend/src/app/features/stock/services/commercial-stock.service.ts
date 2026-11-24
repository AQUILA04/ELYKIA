import { Injectable } from '@angular/core';
import { BaseHttpService } from '@shared/service/base-http.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommercialMonthlyStock, ContinuousStockMovementView, ContinuousStockPeriodRowView, ContinuousStockPositionView, ContinuousStockTeamRowView, StockActivityType } from '../models/commercial-stock.model';
import { SoldValueHistoryEntry } from '../models/sold-value-history.model';
import { StockLinkedSalesResponse } from '../models/stock-linked-sales.model';
import { StockTeamOverview, StockToSettle } from '../models/stock-team.model';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { ErrorHandlerService } from '@shared/service/error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class CommercialStockService extends BaseHttpService {
  movementUrl = '/api/v1/stock/movements';
  v2Url = '/api/v2/commercial-stocks';

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
    this.movementUrl = this.baseUrl + this.movementUrl;
    this.v2Url = this.baseUrl + this.v2Url;
    this.baseUrl += '/api/commercial-stocks';
  }

  getCurrentStock(collector: string): Observable<CommercialMonthlyStock> {
    return this.http.get<CommercialMonthlyStock>(`${this.baseUrl}/current/${collector}`);
  }

  getStockByDate(collector: string, year: number, month: number): Observable<CommercialMonthlyStock> {
    return this.http.get<CommercialMonthlyStock>(`${this.baseUrl}/${collector}/${year}/${month}`);
  }

  /** Vue équipe d'un mois : une ligne par commercial et les totaux (un commercial ne reçoit que sa ligne). */
  getTeamOverview(year: number, month: number, collector?: string | null): Observable<StockTeamOverview> {
    let params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    if (collector) {
      params = params.set('collector', collector);
    }
    return this.http.get<StockTeamOverview>(`${this.baseUrl}/team-overview`, { params });
  }

  /** Mois clôturés à régulariser, du plus ancien au plus récent. */
  getToSettle(collector?: string | null): Observable<StockToSettle[]> {
    let params = new HttpParams();
    if (collector) {
      params = params.set('collector', collector);
    }
    return this.http.get<StockToSettle[]>(`${this.baseUrl}/to-settle`, { params });
  }

  getAvailableItems(collector: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/available/${collector}`);
  }

  getAll(collector: string | null, page: number, size: number, historic: boolean = false): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (collector) {
      params = params.set('collector', collector);
    }
    if (historic) {
      params = params.set('historic', 'true');
    }

    return this.http.get<any>(`${this.baseUrl}`, { params });
  }

  getStockMovements(stockItemId: number): Observable<any> {
    return this.http.get<any>(`${this.movementUrl}/item/${stockItemId}`);
  }

  getSoldValueHistory(stockItemId: number): Observable<SoldValueHistoryEntry[]> {
    return this.http.get<SoldValueHistoryEntry[]>(`${this.baseUrl}/items/${stockItemId}/sold-value-history`);
  }

  getLinkedSales(stockId: number): Observable<StockLinkedSalesResponse> {
    return this.http.get<StockLinkedSalesResponse>(`${this.baseUrl}/${stockId}/linked-sales`);
  }

  exportPdf(collector: string, year: number, month: number): Observable<Blob> {
    const params = new HttpParams()
      .set('collector', collector)
      .set('year', year.toString())
      .set('month', month.toString());
    return this.http.get(`${this.baseUrl}/export/pdf`, { params, responseType: 'blob' });
  }

  getContinuousPositions(collector?: string | null, activityType?: StockActivityType | null, onlyPositive = true): Observable<ContinuousStockPositionView[]> {
    let params = new HttpParams().set('onlyPositive', String(onlyPositive));
    if (collector) params = params.set('collector', collector);
    if (activityType) params = params.set('activityType', activityType);
    return this.http.get<ContinuousStockPositionView[]>(`${this.v2Url}/positions`, { params });
  }

  getContinuousPeriodReport(startDate: string, endDate: string, collector?: string | null, activityType?: StockActivityType | null): Observable<ContinuousStockPeriodRowView[]> {
    let params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    if (collector) params = params.set('collector', collector);
    if (activityType) params = params.set('activityType', activityType);
    return this.http.get<ContinuousStockPeriodRowView[]>(`${this.v2Url}/reports/period`, { params });
  }

  getContinuousTeamOverview(startDate: string, endDate: string, collector?: string | null, activityType?: StockActivityType | null): Observable<ContinuousStockTeamRowView[]> {
    let params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    if (collector) params = params.set('collector', collector);
    if (activityType) params = params.set('activityType', activityType);
    return this.http.get<ContinuousStockTeamRowView[]>(`${this.v2Url}/reports/team-overview`, { params });
  }

  getContinuousMovements(filters: { collector?: string; articleId?: number; activityType?: StockActivityType; startDate?: string; endDate?: string; limit?: number } = {}): Observable<ContinuousStockMovementView[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) params = params.set(k, String(v)); });
    return this.http.get<ContinuousStockMovementView[]>(`${this.v2Url}/movements`, { params });
  }

  transferBetweenActivities(payload: { collector: string; articleId: number; from: StockActivityType; to: StockActivityType; quantity: number; targetSalePrice?: number; accountingDate?: string }): Observable<{ transferId: string }> {
    return this.http.post<{ transferId: string }>(`${this.v2Url}/transfers`, payload);
  }

  realignSalePrices(payload: { articleId: number; activityType?: StockActivityType; collector?: string; newSalePrice: number }): Observable<{ revaluedQuantity: number }> {
    return this.http.post<{ revaluedQuantity: number }>(`${this.v2Url}/realign-prices`, payload);
  }
}
