import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CommercialStockItemDto, CommercialStockItem } from '../../models/commercial-stock-item.model';
import { CommercialStockRepository } from '../repositories/commercial-stock.repository';
import { StockSnapshotRepository } from '../repositories/stock-snapshot.repository';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class CommercialStockService {
  private apiUrl = `${environment.apiUrl}/api/commercial-stocks`;

  constructor(
    private http: HttpClient,
    private repository: CommercialStockRepository,
    private snapshotRepository: StockSnapshotRepository,
    private log: LoggerService
  ) {}

  fetchCommercialStockFromApi(username: string): Observable<CommercialStockItemDto[]> {
    return this.http.get<CommercialStockItemDto[]>(`${this.apiUrl}/available/${username}`);
  }

  /**
   * Synchronise le stock commercial depuis le serveur vers la base locale.
   *
   * Après la sauvegarde locale, crée ou réinitialise le snapshot de stock pour ce commercial.
   * Le snapshot enregistre le stock total reçu du serveur (`stockAtInit`) et remet à zéro
   * le cumul des ventes locales (`localSalesTotal = 0`), car le stock serveur est désormais
   * la nouvelle référence.
   *
   * Ce snapshot est utilisé lors de la validation d'une distribution pour vérifier que
   * le commercial ne dépasse pas son stock réel disponible (stockAtInit - localSalesTotal).
   */
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
            updatedAt: new Date().toISOString(),
            unitPrice: item.creditSalePrice || 0
          } as CommercialStockItem))),
          // Après la sauvegarde locale, créer/réinitialiser le snapshot de stock.
          // Le stock total est la somme des (quantityRemaining * unitPrice) de tous les articles reçus.
          tap(async (stockItems) => {
            try {
              const totalStock = items.reduce((sum, item) => sum + ((item.quantityRemaining || 0) * (item.creditSalePrice || 0)), 0);
              await this.snapshotRepository.upsertSnapshot(username, totalStock);
              this.log.log(
                `[CommercialStockService] Stock snapshot initialized for ${username}: ` +
                `${items.length} articles, totalStockValues=${totalStock}`
              );
            } catch (snapshotError) {
              // Le snapshot est une sécurité supplémentaire, son échec ne doit pas
              // bloquer l'initialisation principale du stock.
              this.log.error('[CommercialStockService] Failed to initialize stock snapshot (non-blocking)', snapshotError);
              console.warn('[CommercialStockService] Stock snapshot initialization failed:', snapshotError);
            }
          })
        );
      })
    );
  }

  getAvailableStock(username: string): Observable<CommercialStockItem[]> {
    return from(this.repository.getAvailableStock(username));
  }
}
