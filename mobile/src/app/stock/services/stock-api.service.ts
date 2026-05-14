import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockRequest, CreateStockRequestPayload } from '../models/stock-request.model';
import { StockReturn, CreateStockReturnPayload } from '../models/stock-return.model';
import { CreateTontineRequestPayload, StockTontineRequest } from '../models/stock-tontine-request.model';
import { CreateTontineReturnPayload, StockTontineReturn } from '../models/stock-tontine-return.model';

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStandardRequests(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/stock-requests`);
  }

  getTontineRequests(): Observable<any> {
    console.log('getTontineRequests called');
    return this.http.get<any>(`${this.baseUrl}/api/v1/stock-tontine-request`);
  }

  getStandardReturns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/stock-returns`);
  }

  getTontineReturns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/v1/stock-tontine-return`);
  }

  createTontineRequest(payload: CreateTontineRequestPayload): Observable<StockTontineRequest> {
    return this.http.post<StockTontineRequest>(`${this.baseUrl}/api/v1/stock-tontine-request/create`, payload);
  }

  createTontineReturn(payload: CreateTontineReturnPayload): Observable<StockTontineReturn> {
    return this.http.post<StockTontineReturn>(`${this.baseUrl}/api/v1/stock-tontine-return/create`, payload);
  }

  cancelTontineRequest(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/v1/stock-tontine-request/${id}/cancel`, {});
  }

  cancelTontineReturn(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/v1/stock-tontine-return/${id}/cancel`, {});
  }

  cancelStandardRequest(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/stock-requests/${id}/cancel`, {});
  }

  cancelStandardReturn(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/stock-returns/${id}/cancel`, {});
  }

  /** Story 2.2 — POST /api/stock-requests/create */
  createStandardRequest(payload: CreateStockRequestPayload): Observable<StockRequest> {
    return this.http.post<StockRequest>(`${this.baseUrl}/api/stock-requests/create`, payload);
  }

  /** Story 2.3 — POST /api/stock-returns/create */
  createStandardReturn(payload: CreateStockReturnPayload): Observable<StockReturn> {
    return this.http.post<StockReturn>(`${this.baseUrl}/api/stock-returns/create`, payload);
  }
}
