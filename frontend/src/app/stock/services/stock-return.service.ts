import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StockReturn, StockReturnDto, StockReturnItem, StockReturnListItem } from '../models/stock-return.model';
import { CommercialMonthlyStock } from '../models/commercial-stock.model';
import { map } from 'rxjs/operators';
import { StockListFilter } from './stock-request.service';
import { Page } from '../../shared/models/page.model';

export interface StockReturnKpis {
  total: number;
  pending: number;
  received: number;
  cancelledRefused: number;
}

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
    return this.http.get<BaseResponse<CommercialMonthlyStock[]>>(`${this.apiUrl}/api/v1/commercial-stock/residual`, { params })
        .pipe(map(res => res.data));
  }

  createHistoriqueReturn(dto: StockReturnDto): Observable<any> {
    return this.http.post<BaseResponse<any>>(`${this.apiUrl}/api/stock-returns/historique`, dto)
        .pipe(map(res => res.data));
  }

  // Add dummy methods to satisfy the other components
  create(data: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/api/stock-returns/create`, data); }
  getAll(filter: StockListFilter, page: number, size: number): Observable<Page<StockReturnListItem>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filter.collector) {
      params = params.set('collector', filter.collector);
    }
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }

    return this.http.get<Page<StockReturnListItem>>(`${this.apiUrl}/api/stock-returns`, { params });
  }

  getById(id: number): Observable<StockReturn> {
    return this.http.get<StockReturn>(`${this.apiUrl}/api/stock-returns/${id}`);
  }

  getItemsById(id: number): Observable<StockReturnItem[]> {
    return this.http.get<StockReturnItem[]>(`${this.apiUrl}/api/stock-returns/${id}/items`);
  }

  getKpis(filter: StockListFilter): Observable<StockReturnKpis> {
    let params = new HttpParams();
    if (filter.collector) {
      params = params.set('collector', filter.collector);
    }
    if (filter.startDate) {
      params = params.set('startDate', filter.startDate);
    }
    if (filter.endDate) {
      params = params.set('endDate', filter.endDate);
    }
    return this.http.get<StockReturnKpis>(`${this.apiUrl}/api/stock-returns/kpis`, { params });
  }
  validate(id: number): Observable<any> { return this.http.put<any>(`${this.apiUrl}/api/stock-returns/${id}/validate`, {}); }
  cancel(id: number): Observable<any> { return this.http.put<any>(`${this.apiUrl}/api/stock-returns/${id}/cancel`, {}); }
  refuse(id: number): Observable<any> { return this.http.put<any>(`${this.apiUrl}/api/stock-returns/${id}/refuse`, {}); }
}
