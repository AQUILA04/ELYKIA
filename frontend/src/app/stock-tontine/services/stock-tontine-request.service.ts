import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockTontineRequest, StockTontineRequestItem, StockTontineRequestListItem } from '../models/stock-tontine-request.model';
import { PartialDeliveryResponseDTO } from '../../stock/models/stock-request.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { Page } from '../../shared/models/page.model';
import { StockListFilter, StockRequestKpis } from '../../stock/services/stock-request.service';

@Injectable({
  providedIn: 'root'
})
export class StockTontineRequestService extends BaseHttpService {

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
    this.baseUrl += '/api/v1/stock-tontine-request';
  }

  create(request: any): Observable<StockTontineRequest> {
    return this.post<StockTontineRequest>(`${this.baseUrl}/create`, request);
  }

  validate(id: number): Observable<StockTontineRequest> {
    return this.put<StockTontineRequest>(`${this.baseUrl}/${id}/validate`, {});
  }

  deliver(id: number): Observable<PartialDeliveryResponseDTO> {
    return this.put<PartialDeliveryResponseDTO>(`${this.baseUrl}/${id}/deliver`, {});
  }

  cancel(id: number): Observable<StockTontineRequest> {
    return this.put<StockTontineRequest>(`${this.baseUrl}/${id}/cancel`, {});
  }

  refuse(id: number): Observable<StockTontineRequest> {
    return this.put<StockTontineRequest>(`${this.baseUrl}/${id}/refuse`, {});
  }

  getById(id: number): Observable<StockTontineRequest> {
    return this.get<StockTontineRequest>(`${this.baseUrl}/${id}`);
  }

  getItemsById(id: number): Observable<StockTontineRequestItem[]> {
    return this.get<StockTontineRequestItem[]>(`${this.baseUrl}/${id}/items`);
  }

  getAll(filter: StockListFilter, page: number = 0, size: number = 20): Observable<Page<StockTontineRequestListItem>> {
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

    return this.get<Page<StockTontineRequestListItem>>(this.baseUrl, { params });
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
    return this.get<StockRequestKpis>(`${this.baseUrl}/kpis`, { params });
  }

  getMyRequests(page: number = 0, size: number = 20): Observable<Page<StockTontineRequest>> {
    return this.getAll({}, page, size);
  }

  exportPdf(startDate: string, endDate: string, collector: string | null): Observable<Blob> {
    let url = `${this.baseUrl}/export/pdf?startDate=${startDate}&endDate=${endDate}`;
    if (collector) {
      url += `&collector=${collector}`;
    }
    return this.get(url, { responseType: 'blob' });
  }

  exportPdfByRequestIds(requestIds: number[]): Observable<Blob> {
    let params = new HttpParams();
    requestIds.forEach(id => {
      params = params.append('requestIds', id);
    });
    return this.get(`${this.baseUrl}/export/pdf`, { params, responseType: 'blob' });
  }
}
