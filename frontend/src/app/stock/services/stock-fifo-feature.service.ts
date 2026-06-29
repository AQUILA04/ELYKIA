import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ArticleStockLot {
  id: number;
  articleId: number;
  quantityInitial: number;
  quantityRemaining: number;
  unitPurchasePrice: number;
  entryDate?: string;
  sourceType?: string;
  status?: string;
  remainingValue: number;
}

@Injectable({
  providedIn: 'root'
})
export class StockFifoFeatureService {
  private readonly apiUrl = `${environment.apiUrl}/api/parameters/enabled`;
  private cachedFifoEnabled: boolean | null = null;
  private fifoEnabled$?: Observable<boolean>;

  constructor(private http: HttpClient) {}

  isFifoEnabled(refresh = false): Observable<boolean> {
    if (!refresh && this.cachedFifoEnabled !== null) {
      return of(this.cachedFifoEnabled);
    }
    if (!refresh && this.fifoEnabled$) {
      return this.fifoEnabled$;
    }

    this.fifoEnabled$ = this.http
      .get<boolean>(`${this.apiUrl}/ENABLED_FIFO_STOCK_VALUATION`)
      .pipe(
        tap((enabled) => {
          this.cachedFifoEnabled = enabled;
        }),
        catchError(() => {
          this.cachedFifoEnabled = false;
          return of(false);
        }),
        shareReplay(1)
      );

    return this.fifoEnabled$;
  }

  clearCache(): void {
    this.cachedFifoEnabled = null;
    this.fifoEnabled$ = undefined;
  }

  getArticleLots(articleId: number): Observable<ArticleStockLot[]> {
    return this.http
      .get<{ data?: ArticleStockLot[] }>(
        `${environment.apiUrl}/api/v1/stock/fifo/articles/${articleId}/lots`
      )
      .pipe(
        map((response) => response.data ?? []),
        catchError(() => of([]))
      );
  }
}
