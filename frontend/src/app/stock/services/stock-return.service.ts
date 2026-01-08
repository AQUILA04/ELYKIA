import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockReturn } from '../models/stock-return.model';
import { Page } from '../../shared/models/page.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class StockReturnService extends BaseHttpService {

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
    this.baseUrl += '/stock-returns';
  }

  create(stockReturn: StockReturn): Observable<StockReturn> {
    return this.http.post<StockReturn>(`${this.baseUrl}/create`, stockReturn);
  }

  validate(id: number): Observable<StockReturn> {
    return this.http.put<StockReturn>(`${this.baseUrl}/${id}/validate`, {});
  }

  getByCollector(collector: string, page: number = 0, size: number = 20): Observable<Page<StockReturn>> {
    return this.http.get<Page<StockReturn>>(`${this.baseUrl}/collector/${collector}?page=${page}&size=${size}`);
  }
}
