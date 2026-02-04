import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CommercialStockItemDto, CommercialStockItem } from '../../models/commercial-stock-item.model';
import { CommercialStockRepository } from '../repositories/commercial-stock.repository';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class CommercialStockService {
  private apiUrl = `${environment.apiUrl}/api/commercial-stocks`;

  constructor(
    private http: HttpClient,
    private repository: CommercialStockRepository,
    private log: LoggerService
  ) {}

  fetchCommercialStockFromApi(username: string): Observable<CommercialStockItemDto[]> {
    return this.http.get<CommercialStockItemDto[]>(`${this.apiUrl}/available/${username}`);
  }

  syncCommercialStock(username: string): Observable<CommercialStockItem[]> {
    return this.fetchCommercialStockFromApi(username).pipe(
      switchMap(items => {
        return from(this.repository.saveWithCommercialUsername(items, username)).pipe(
          map(() => items.map(item => ({
            ...item,
            quantityTaken: item.quantityTaken || 0,
            quantitySold: item.quantitySold || 0,
            quantityReturned: item.quantityReturned || 0,
            commercialUsername: item.commercialUsername || username,
            month: item.month || new Date().getMonth() + 1,
            year: item.year || new Date().getFullYear(),
            updatedAt: new Date().toISOString()
          } as CommercialStockItem)))
        );
      })
    );
  }

  getAvailableStock(username: string): Observable<CommercialStockItem[]> {
    return from(this.repository.getAvailableStock(username));
  }
}
