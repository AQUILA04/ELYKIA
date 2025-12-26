import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { StockOutput } from '../../models/stock-output.model';
import { ApiResponse } from '../../models/api-response.model';
import { HealthCheckService } from './health-check.service';

@Injectable({
  providedIn: 'root'
})
export class StockOutputService {
  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private healthCheckService: HealthCheckService
  ) { }

  initializeStockOutputs(commercialUsername: string): Observable<StockOutput[]> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchStockOutputsFromApi(commercialUsername).pipe(
            tap(async (stockOutputs) => {
              await this.dbService.saveStockOutputs(stockOutputs);
              console.log('Stock Outputs fetched from API and saved locally.');
            }),
            catchError(async (error) => {
              console.error('Failed to fetch stock outputs from API, attempting local:', error);
              return this.getLocalStockOutputs();
            })
          );
        } else {
          return from(this.getLocalStockOutputs());
        }
      })
    );
  }

  private fetchStockOutputsFromApi(commercialUsername: string): Observable<StockOutput[]> {
    const url = `${environment.apiUrl}/api/v1/credits/stock-output/by-commercial/${commercialUsername}`;
    return this.http.get<ApiResponse<StockOutput[]>>(url).pipe(
      map(response => response.data.filter(so => so.status === 'INPROGRESS' && so.updatable))
    );
  }

  private async getLocalStockOutputs(): Promise<StockOutput[]> {
    const stockOutputs = await this.dbService.getStockOutputs();
    if (stockOutputs.length > 0) {
      console.log('Using locally stored stock outputs.');
      return stockOutputs;
    } else {
      console.error('No stock outputs available locally.');
      return [];
    }
  }

  /**
   * Retourne les informations du commercial sous forme d'Observable.
   * Utilise la logique de récupération locale existante.
   */
  public getStockOutputs(): Observable<StockOutput[]> {
    return from(this.getLocalStockOutputs());
  }

  public getStockOutputsByCommercialUsername(username: string): Observable<StockOutput[]> {
    return from(this.dbService.getStockOutputs()).pipe(
      map(stockOutputs => stockOutputs.filter(so => so.commercialId === username)),
      catchError(error => {
        console.error('Failed to get stock outputs by commercial username from local database:', error);
        return of([]);
      })
    );
  }
}
