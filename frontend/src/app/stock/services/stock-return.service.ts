import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StockReturnDto } from '../models/stock-return.model';
import { CommercialMonthlyStock } from '../models/commercial-stock.model';
import { map } from 'rxjs/operators';

interface BaseResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  service: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class StockReturnService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getHistoricalStocks(collector: string): Observable<CommercialMonthlyStock[]> {
    let params = new HttpParams().set('collector', collector);
    return this.http.get<BaseResponse<CommercialMonthlyStock[]>>(`${this.apiUrl}/v1/commercial-stock/residual`, { params })
        .pipe(map(res => res.data));
  }

  createHistoriqueReturn(dto: StockReturnDto): Observable<any> {
    return this.http.post<BaseResponse<any>>(`${this.apiUrl}/v1/stock-returns/historique`, dto)
        .pipe(map(res => res.data));
  }

  // Add dummy methods to satisfy the other components
  create(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/stock-returns/create`, data); }
  getAll(collector: any, page: number, size: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/stock-returns`); }
  validate(id: number): Observable<any> { return this.http.put<any>(`${this.apiUrl}/stock-returns/${id}/validate`, {}); }
  cancel(id: number): Observable<any> { return this.http.put<any>(`${this.apiUrl}/stock-returns/${id}/cancel`, {}); }
  refuse(id: number): Observable<any> { return this.http.put<any>(`${this.apiUrl}/stock-returns/${id}/refuse`, {}); }
}
