import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
  [key: string]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingStateService {
  private loadingStateSubject = new BehaviorSubject<LoadingState>({});
  public loadingState$ = this.loadingStateSubject.asObservable();

  /**
   * Définit l'état de chargement pour une opération spécifique
   */
  setLoading(operation: string, loading: boolean): void {
    const currentState = this.loadingStateSubject.value;
    this.loadingStateSubject.next({
      ...currentState,
      [operation]: loading
    });
  }

  /**
   * Vérifie si une opération spécifique est en cours de chargement
   */
  isLoading(operation: string): Observable<boolean> {
    return new Observable(observer => {
      this.loadingState$.subscribe(state => {
        observer.next(state[operation] || false);
      });
    });
  }

  /**
   * Vérifie si au moins une opération est en cours de chargement
   */
  isAnyLoading(): Observable<boolean> {
    return new Observable(observer => {
      this.loadingState$.subscribe(state => {
        const hasLoading = Object.values(state).some(loading => loading);
        observer.next(hasLoading);
      });
    });
  }

  /**
   * Réinitialise tous les états de chargement
   */
  resetAll(): void {
    this.loadingStateSubject.next({});
  }

  /**
   * Obtient l'état de chargement actuel pour une opération
   */
  getCurrentLoadingState(operation: string): boolean {
    return this.loadingStateSubject.value[operation] || false;
  }

  /**
   * Exécute une fonction avec gestion automatique de l'état de chargement
   */
  async withLoading<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      this.setLoading(operation, true);
      return await fn();
    } finally {
      this.setLoading(operation, false);
    }
  }
}

// Constantes pour les opérations de chargement communes
export const LOADING_OPERATIONS = {
  // Opérations de données
  FETCH_ORDERS: 'fetchOrders',
  FETCH_ORDER_DETAILS: 'fetchOrderDetails',
  FETCH_KPIS: 'fetchKpis',
  FETCH_CLIENTS: 'fetchClients',
  FETCH_ARTICLES: 'fetchArticles',
  
  // Opérations CRUD
  CREATE_ORDER: 'createOrder',
  UPDATE_ORDER: 'updateOrder',
  DELETE_ORDER: 'deleteOrder',
  
  // Opérations de statut
  UPDATE_ORDER_STATUS: 'updateOrderStatus',
  BULK_UPDATE_STATUS: 'bulkUpdateStatus',
  SELL_ORDER: 'sellOrder',
  
  // Opérations de recherche
  SEARCH_CLIENTS: 'searchClients',
  SEARCH_ARTICLES: 'searchArticles',
  
  // Opérations d'export/import
  EXPORT_ORDERS: 'exportOrders',
  IMPORT_ORDERS: 'importOrders'
} as const;

export type LoadingOperation = typeof LOADING_OPERATIONS[keyof typeof LOADING_OPERATIONS];