import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { StockRequest } from '../models/stock-request.model';

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
    return this.http.get<ApiResponse<StockRequest[]>>(`${this.baseUrl}/api/v1/stock-tontine-request`);
  }
}
