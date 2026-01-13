import { Injectable } from '@angular/core';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TontineStock } from '../models/tontine-stock.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';
import { Page } from '../../shared/models/page.model';

@Injectable({
  providedIn: 'root'
})
export class TontineStockService extends BaseHttpService {

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
    this.baseUrl += '/api/v1/tontines';
  }

  getMyStock(): Observable<TontineStock[]> {
    // Garder cette méthode pour compatibilité si nécessaire, ou la migrer
    return this.get<TontineStock[]>(`${this.baseUrl}/stock?size=1000`);
  }

  getStockByCommercial(commercial: string): Observable<TontineStock[]> {
    return this.get<TontineStock[]>(`${this.baseUrl}/stock?commercial=${commercial}&size=1000`);
  }

  getAll(commercial: string | null, page: number, size: number, historic: boolean): Observable<Page<TontineStock>> {
    let url = `${this.baseUrl}/stock?page=${page}&size=${size}`;
    if (commercial) {
      url += `&commercial=${commercial}`;
    }
    if (historic) {
      url += `&historic=true`;
    }
    return this.get<Page<TontineStock>>(url);
  }
}
