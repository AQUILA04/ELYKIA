import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { StockRequest } from '../models/stock-request.model';
import { StockReturn } from '../models/stock-return.model';
import { CreateTontineRequestPayload, StockTontineRequest } from '../models/stock-tontine-request.model';
import { CreateTontineReturnPayload, StockTontineReturn } from '../models/stock-tontine-return.model';

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStandardRequests(): Observable<ApiResponse<StockRequest[]>> {
    return this.http.get<ApiResponse<StockRequest[]>>(`${this.baseUrl}/api/stock-requests`);
  }

  getTontineRequests(): Observable<ApiResponse<StockRequest[]>> {
    console.log('getTontineRequests called');
    return this.http.get<ApiResponse<StockRequest[]>>(`${this.baseUrl}/api/v1/stock-tontine-request`);
  }

  getStandardReturns(): Observable<ApiResponse<StockReturn[]>> {
    return this.http.get<ApiResponse<StockReturn[]>>(`${this.baseUrl}/api/stock-returns`);
  }

  getTontineReturns(): Observable<ApiResponse<StockReturn[]>> {
    return this.http.get<ApiResponse<StockReturn[]>>(`${this.baseUrl}/api/v1/stock-tontine-return`);
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
}
