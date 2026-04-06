import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { StockOutput } from '../../models/stock-output.model';
import { ApiResponse } from '../../models/api-response.model';
import { HealthCheckService } from './health-check.service';
import { StockOutputRepository } from '../repositories/stock-output.repository';
import { StockOutputRepositoryExtensions, StockOutputRepositoryFilters } from '../repositories/stock-output.repository.extensions';
import { Page } from '../repositories/repository.interface';

@Injectable({
  providedIn: 'root'
})
export class StockOutputService {
  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private healthCheckService: HealthCheckService,
    private stockOutputRepository: StockOutputRepository,
    private stockOutputRepositoryExtensions: StockOutputRepositoryExtensions
  ) { }

  initializeStockOutputs(commercialUsername: string): Observable<StockOutput[]> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchStockOutputsFromApi(commercialUsername).pipe(
            tap(async (stockOutputs) => {
              await this.stockOutputRepository.saveAll(stockOutputs);
              console.log('Stock Outputs fetched from API and saved locally.');
            }),
            catchError(async (error) => {
              console.error('Failed to fetch stock outputs from API, attempting local:', error);
              // Return empty to avoid loading all
              return [];
            })
          );
        } else {
          return of([]);
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
    console.warn('getLocalStockOutputs is deprecated. Use getStockOutputsPaginated instead.');
    return [];
  }

  /**
   * Retourne les informations du commercial sous forme d'Observable.
   * Utilise la logique de récupération locale existante.
   */
  public getStockOutputs(): Observable<StockOutput[]> {
    console.warn('getStockOutputs is deprecated. Use getStockOutputsPaginated instead.');
    return of([]);
  }

  public getStockOutputsByCommercialUsername(username: string): Observable<StockOutput[]> {
    console.warn('getStockOutputsByCommercialUsername is deprecated. Use getStockOutputsPaginated instead.');
    return of([]);
  }

  /**
   * Get paginated stock outputs
   */
  getStockOutputsPaginated(commercialUsername: string, page: number, size: number, filters?: StockOutputRepositoryFilters): Observable<Page<StockOutput>> {
    return from(this.stockOutputRepositoryExtensions.findByCommercialPaginated(commercialUsername, page, size, filters));
  }
}
