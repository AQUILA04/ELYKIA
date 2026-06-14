import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockRequest, StockRequestStatus, PartialDeliveryResponseDTO, StockRequestCreateDto } from '../models/stock-request.model';
import { Page } from '../../shared/models/page.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

export interface StockRequestKpis {
  total: number;
  pending: number;
  validated: number;
  delivered: number;
}

export interface StockListFilter {
  collector?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

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

  create(request: StockRequestCreateDto): Observable<StockRequest> {
    return this.http.post<StockRequest>(`${this.baseUrl}/create`, request);
  }

  validate(id: number): Observable<StockRequest> {
    return this.http.put<StockRequest>(`${this.baseUrl}/${id}/validate`, {});
  }

  deliver(id: number): Observable<PartialDeliveryResponseDTO> {
    return this.http.put<PartialDeliveryResponseDTO>(`${this.baseUrl}/${id}/deliver`, {});
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

  getAll(filter: StockListFilter, page: number = 0, size: number = 20): Observable<any> {
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

    return this.http.get<any>(`${this.baseUrl}`, { params });
  }

  getKpis(filter: StockListFilter): Observable<StockRequestKpis> {
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
    return this.http.get<StockRequestKpis>(`${this.baseUrl}/kpis`, { params });
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
