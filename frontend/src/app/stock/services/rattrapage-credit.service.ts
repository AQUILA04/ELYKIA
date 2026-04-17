import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../../shared/service/base-http.service';
import { TokenStorageService } from '../../shared/service/token-storage.service';
import { ErrorHandlerService } from '../../shared/service/error-handler.service';
import { CommercialMonthlyStock } from '../models/commercial-stock.model';
import { RattrapageCreditDto } from '../models/rattrapage-credit.model';

@Injectable({
  providedIn: 'root'
})
export class RattrapageCreditService extends BaseHttpService {

  constructor(
    protected override http: HttpClient,
    protected override tokenStorage: TokenStorageService,
    protected override errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
  }

  /**
   * Récupère les stocks résiduels (mois antérieurs) d'un commercial
   * ayant au moins un article avec quantityRemaining > 0.
   */
  getResidualStocks(collector: string): Observable<CommercialMonthlyStock[]> {
    const params = new HttpParams().set('collector', collector);
    return this.http.get<any>(`${this.baseUrl}/api/v1/commercial-stock/residual`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: any) => response.data || [])
    );
  }

  /**
   * Crée un crédit de rattrapage.
   */
  createRattrapage(dto: RattrapageCreditDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/credits/rattrapage`, dto, {
      headers: this.getAuthHeaders()
    });
  }
}
