import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CommercialStockRepository } from '../repositories/commercial-stock.repository';
import { CommercialStockItem } from '../../models/commercial-stock-item.model';
import { ApiResponse } from '../../models/api-response.model';
import { HealthCheckService } from './health-check.service';

@Injectable({
  providedIn: 'root'
})
export class CommercialStockService {
  constructor(
    private http: HttpClient,
    private commercialStockRepository: CommercialStockRepository,
    private healthCheckService: HealthCheckService
  ) { }

  initializeCommercialStock(commercialUsername: string): Observable<CommercialStockItem[]> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchCommercialStockFromApi(commercialUsername).pipe(
            tap(async (stockItems) => {
              await this.commercialStockRepository.saveWithCommercialUsername(stockItems, commercialUsername);
              console.log('Commercial stock items fetched from API and saved locally.');
            }),
            catchError(async (error) => {
              console.error('Failed to fetch commercial stock from API, attempting local:', error);
              return this.getLocalCommercialStock(commercialUsername);
            })
          );
        } else {
          return from(this.getLocalCommercialStock(commercialUsername));
        }
      })
    );
  }

  private fetchCommercialStockFromApi(commercialUsername: string): Observable<CommercialStockItem[]> {
    const url = `${environment.apiUrl}/api/commercial-stocks/available/${commercialUsername}`;
    return this.http.get<ApiResponse<CommercialStockItem[]>>(url).pipe(
      map(response => response.data || [])
    );
  }

  private async getLocalCommercialStock(commercialUsername: string): Promise<CommercialStockItem[]> {
    const stockItems = await this.commercialStockRepository.findByCommercialUsername(commercialUsername);
    if (stockItems.length > 0) {
      console.log('Using locally stored commercial stock items.');
      return stockItems;
    } else {
      console.error('No commercial stock items available locally.');
      return [];
    }
  }

  public getCommercialStock(commercialUsername: string): Observable<CommercialStockItem[]> {
    return from(this.getLocalCommercialStock(commercialUsername));
  }

  public getAvailableStock(commercialUsername: string): Observable<CommercialStockItem[]> {
    return from(this.commercialStockRepository.findAvailableByCommercialUsername(commercialUsername));
  }

  public updateStockQuantity(articleId: number, newQuantity: number): Observable<boolean> {
    return from(this.commercialStockRepository.updateQuantity(articleId, newQuantity)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Failed to update stock quantity:', error);
        return of(false);
      })
    );
  }

  public reduceStockQuantities(articles: Array<{articleId: number, quantity: number}>): Observable<boolean> {
    return from(this.commercialStockRepository.reduceQuantities(articles)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Failed to reduce stock quantities:', error);
        return of(false);
      })
    );
  }

  public checkStockAvailability(articles: Array<{articleId: number, quantity: number}>): Observable<boolean> {
    return from(this.commercialStockRepository.checkStockAvailability(articles));
  }

  public getStockAvailabilityDetails(articles: Array<{articleId: number, quantity: number}>): Observable<Array<{
    articleId: number;
    requested: number;
    available: number;
    sufficient: boolean;
    articleName?: string;
  }>> {
    return from(this.commercialStockRepository.getStockAvailabilityDetails(articles));
  }
}