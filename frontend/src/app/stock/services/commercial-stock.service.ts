import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommercialMonthlyStock } from '../models/commercial-stock.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class CommercialStockService extends BaseHttpService {

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
    this.baseUrl += '/commercial-stocks';
  }

  getCurrentStock(collector: string): Observable<CommercialMonthlyStock> {
    return this.http.get<CommercialMonthlyStock>(`${this.baseUrl}/current/${collector}`);
  }

  getStockByDate(collector: string, year: number, month: number): Observable<CommercialMonthlyStock> {
    return this.http.get<CommercialMonthlyStock>(`${this.baseUrl}/${collector}/${year}/${month}`);
  }
}
