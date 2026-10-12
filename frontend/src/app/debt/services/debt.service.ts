import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  DebtDocument,
  DebtSettleRequest,
  DebtSettlement,
  DebtStatus,
  DebtSummary,
  DebtType
} from '../models/debt.model';

@Injectable({ providedIn: 'root' })
export class DebtService {
  private readonly apiUrl = `${environment.apiUrl}/api/debts`;

  constructor(private http: HttpClient) {}

  search(filters: {
    holder?: string;
    type?: DebtType;
    status?: DebtStatus;
    year?: number;
    month?: number;
    page?: number;
    size?: number;
  }): Observable<{ content: DebtDocument[]; totalElements: number }> {
    let params = new HttpParams();
    if (filters.holder) params = params.set('holder', filters.holder);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.year != null) params = params.set('year', String(filters.year));
    if (filters.month != null) params = params.set('month', String(filters.month));
    params = params.set('page', String(filters.page ?? 0));
    params = params.set('size', String(filters.size ?? 20));
    return this.http.get<{ content: DebtDocument[]; totalElements: number }>(this.apiUrl, { params });
  }

  summary(): Observable<DebtSummary> {
    return this.http.get<DebtSummary>(`${this.apiUrl}/summary`);
  }

  getById(id: number): Observable<DebtDocument> {
    return this.http.get<DebtDocument>(`${this.apiUrl}/${id}`);
  }

  byStock(stockId: number): Observable<DebtDocument> {
    return this.http.get<DebtDocument>(`${this.apiUrl}/by-stock/${stockId}`);
  }

  createMerchandise(monthlyStockId: number): Observable<DebtDocument> {
    return this.http.post<DebtDocument>(`${this.apiUrl}/merchandise`, { monthlyStockId });
  }

  createCash(payload: {
    commercialUsername: string;
    periodGrain: 'DAY' | 'MONTH';
    day?: string;
    year?: number;
    month?: number;
  }): Observable<DebtDocument> {
    return this.http.post<DebtDocument>(`${this.apiUrl}/cash`, payload);
  }

  recalculate(id: number): Observable<DebtDocument> {
    return this.http.post<DebtDocument>(`${this.apiUrl}/${id}/recalculate`, {});
  }

  cancel(id: number, reason?: string): Observable<DebtDocument> {
    let params = new HttpParams();
    if (reason) params = params.set('reason', reason);
    return this.http.post<DebtDocument>(`${this.apiUrl}/${id}/cancel`, {}, { params });
  }

  settle(request: DebtSettleRequest): Observable<DebtSettlement> {
    return this.http.post<DebtSettlement>(`${this.apiUrl}/settle`, request);
  }
}
