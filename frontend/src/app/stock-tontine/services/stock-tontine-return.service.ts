import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockTontineReturn, StockTontineReturnItem, StockTontineReturnListItem } from '../models/stock-tontine-return.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { Page } from '../../shared/models/page.model';
import { StockListFilter } from '../../stock/services/stock-request.service';
import { StockReturnKpis } from '../../stock/services/stock-return.service';

@Injectable({
  providedIn: 'root'
})
export class StockTontineReturnService extends BaseHttpService {

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
    this.baseUrl += '/api/v1/stock-tontine-return';
  }

  create(request: any): Observable<StockTontineReturn> {
    return this.post<StockTontineReturn>(`${this.baseUrl}/create`, request);
  }

  validate(id: number): Observable<StockTontineReturn> {
    return this.put<StockTontineReturn>(`${this.baseUrl}/${id}/validate`, {});
  }

  getById(id: number): Observable<StockTontineReturn> {
    return this.get<StockTontineReturn>(`${this.baseUrl}/${id}`);
  }

  getItemsById(id: number): Observable<StockTontineReturnItem[]> {
    return this.get<StockTontineReturnItem[]>(`${this.baseUrl}/${id}/items`);
  }

  getAllReturns(filter: StockListFilter, page: number = 0, size: number = 20): Observable<Page<StockTontineReturnListItem>> {
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

    return this.get<Page<StockTontineReturnListItem>>(this.baseUrl, { params });
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
    return this.get<StockReturnKpis>(`${this.baseUrl}/kpis`, { params });
  }

  exportPdf(startDate: string, endDate: string, collector: string | null): Observable<Blob> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    if (collector) {
      params = params.set('collector', collector);
    }
    return this.http.get(`${this.baseUrl}/export/pdf`, { params, responseType: 'blob' });
  }

  exportPdfByRequestIds(requestIds: number[]): Observable<Blob> {
    let params = new HttpParams();
    requestIds.forEach(id => {
      params = params.append('requestIds', id);
    });
    return this.http.get(`${this.baseUrl}/export/pdf`, { params, responseType: 'blob' });
  }

  getMyReturns(page: number = 0, size: number = 20): Observable<Page<StockTontineReturn>> {
    return this.getAllReturns({}, page, size);
  }
}
