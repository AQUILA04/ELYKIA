import { Injectable } from '@angular/core';
import { BaseHttpService } from '@shared/service/base-http.service';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface TontineDeliveryStockFilter {
  dateFrom?: string;
  dateTo?: string;
  commercial?: string | null;
  search?: string | null;
}

export interface TontineDeliveryStockPreview {
  orderCount: number;
  groups: {
    collector: string;
    orderIds: number[];
    articles: { name: string; quantity: number }[];
  }[];
}
import { Observable } from 'rxjs';
import { StockTontineRequest, StockTontineRequestItem, StockTontineRequestListItem } from '../models/stock-tontine-request.model';
import { PartialDeliveryResponseDTO } from '@features/stock/models/stock-request.model';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { ErrorHandlerService } from '@shared/service/error-handler.service';
import { Page } from '@shared/models/page.model';
import { StockListFilter, StockRequestKpis } from '@features/stock/services/stock-request.service';

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

  previewFromDeliveries(deliveryIds: number[]): Observable<TontineDeliveryStockPreview> {
    return this.post<TontineDeliveryStockPreview>(`${this.baseUrl}/from-deliveries/preview`, { deliveryIds });
  }

  createFromDeliveries(deliveryIds: number[]): Observable<StockTontineRequest[]> {
    return this.post<StockTontineRequest[]>(`${this.baseUrl}/from-deliveries`, { deliveryIds });
  }

  previewPendingDeliveries(filter: TontineDeliveryStockFilter): Observable<TontineDeliveryStockPreview> {
    return this.post<TontineDeliveryStockPreview>(
      `${this.baseUrl}/from-pending-deliveries/preview`,
      {},
      { params: this.deliveryFilterParams(filter) }
    );
  }

  createFromPendingDeliveries(filter: TontineDeliveryStockFilter): Observable<StockTontineRequest[]> {
    return this.post<StockTontineRequest[]>(
      `${this.baseUrl}/from-pending-deliveries`,
      {},
      { params: this.deliveryFilterParams(filter) }
    );
  }

  private deliveryFilterParams(filter: TontineDeliveryStockFilter): HttpParams {
    let params = new HttpParams();
    if (filter.dateFrom) {
      params = params.set('dateFrom', filter.dateFrom);
    }
    if (filter.dateTo) {
      params = params.set('dateTo', filter.dateTo);
    }
    if (filter.commercial) {
      params = params.set('commercial', filter.commercial);
    }
    if (filter.search) {
      params = params.set('search', filter.search);
    }
    return params;
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
