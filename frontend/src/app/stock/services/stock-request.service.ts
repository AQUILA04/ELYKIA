import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockRequest, StockRequestStatus } from '../models/stock-request.model';
import { Page } from '../../shared/models/page.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class StockRequestService extends BaseHttpService {

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
    this.baseUrl += '/api/stock-requests';
  }

  create(request: StockRequest): Observable<StockRequest> {
    return this.http.post<StockRequest>(`${this.baseUrl}/create`, request);
  }

  validate(id: number): Observable<StockRequest> {
    return this.http.put<StockRequest>(`${this.baseUrl}/${id}/validate`, {});
  }

  deliver(id: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}/deliver`, {});
  }

  cancel(id: number): Observable<StockRequest> {
    return this.http.put<StockRequest>(`${this.baseUrl}/${id}/cancel`, {});
  }

  refuse(id: number): Observable<StockRequest> {
    return this.http.put<StockRequest>(`${this.baseUrl}/${id}/refuse`, {});
  }

  getByCollector(collector: string, page: number = 0, size: number = 20): Observable<Page<StockRequest>> {
    return this.http.get<Page<StockRequest>>(`${this.baseUrl}/collector/${collector}?page=${page}&size=${size}`);
  }

  getAll(collector: string | null, page: number = 0, size: number = 20): Observable<any> {
    console.log('Get All call ...')
    if (collector) {
      console.log('If collector ...')
      return this.http.get<Page<StockRequest>>(`${this.baseUrl}?collector=${collector}&page=${page}&size=${size}`);
    }
    console.log('else collector ...')
    return this.http.get<any>(`${this.baseUrl}?page=${page}&size=${size}`);
  }

  getByStatus(status: StockRequestStatus, page: number = 0, size: number = 20): Observable<Page<StockRequest>> {
    return this.http.get<Page<StockRequest>>(`${this.baseUrl}/status/${status}?page=${page}&size=${size}`);
  }

  exportPdf(startDate: string, endDate: string, collector: string | null): Observable<Blob> {
    let url = `${this.baseUrl}/export/pdf?startDate=${startDate}&endDate=${endDate}`;
    if (collector) {
      url += `&collector=${collector}`;
    }
    return this.http.get(url, { responseType: 'blob' });
  }
}
