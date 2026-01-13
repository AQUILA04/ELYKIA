import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StockTontineRequest } from '../models/stock-tontine-request.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { Page } from '../../shared/models/page.model';

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

  deliver(id: number): Observable<StockTontineRequest> {
    return this.put<StockTontineRequest>(`${this.baseUrl}/${id}/deliver`, {});
  }

  getAll(collector: string | null, page: number = 0, size: number = 20): Observable<Page<StockTontineRequest>> {
    let url = `${this.baseUrl}?page=${page}&size=${size}`;
    if (collector) {
      url += `&collector=${collector}`;
    }
    return this.get<Page<StockTontineRequest>>(url);
  }

  // getMyRequests n'est plus nécessaire car getAll gère le contexte utilisateur côté backend
  // Mais si le composant l'utilise, je peux le rediriger vers getAll
  getMyRequests(page: number = 0, size: number = 20): Observable<Page<StockTontineRequest>> {
     return this.getAll(null, page, size);
  }
}
