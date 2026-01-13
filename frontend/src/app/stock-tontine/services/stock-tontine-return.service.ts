import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockTontineReturn } from '../models/stock-tontine-return.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { Page } from '../../shared/models/page.model';

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

  getAllReturns(collector: string | null, page: number = 0, size: number = 20): Observable<Page<StockTontineReturn>> {
    let url = `${this.baseUrl}?page=${page}&size=${size}`;
    if (collector) {
      url += `&collector=${collector}`;
    }
    return this.get<Page<StockTontineReturn>>(url);
  }

  // Méthode de compatibilité/raccourci
  getMyReturns(page: number = 0, size: number = 20): Observable<Page<StockTontineReturn>> {
    return this.getAllReturns(null, page, size);
  }
}
