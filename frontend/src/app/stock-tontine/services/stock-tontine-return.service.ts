import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockTontineReturn } from '../models/stock-tontine-return.model';
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

  getAllReturns(filter: StockListFilter, page: number = 0, size: number = 20): Observable<Page<StockTontineReturn>> {
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

    return this.get<Page<StockTontineReturn>>(this.baseUrl, { params });
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

  getMyReturns(page: number = 0, size: number = 20): Observable<Page<StockTontineReturn>> {
    return this.getAllReturns({}, page, size);
  }
}
