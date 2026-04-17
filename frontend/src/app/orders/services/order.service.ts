import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { LoadingStateService, LOADING_OPERATIONS } from './loading-state.service';
import { ErrorHandlerService } from './error-handler.service';
import {
  Order,
  OrderItem,
  OrderKPI,
  OrderClient,
  OrderArticle,
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderFilters,
  ApiResponse,
  PaginatedResponse,
  OrderStatus,
  OrderState,
  ORDER_CONSTANTS
} from '../types/order.types';
import { AuthService } from "../../auth/service/auth.service";

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/orders`;

  // État réactif de l'application
  private stateSubject = new BehaviorSubject<OrderState>({
    orders: [],
    filteredOrders: [],
    filters: {},
    pagination: {
      page: 0,
      size: ORDER_CONSTANTS.DEFAULT_PAGE_SIZE,
      totalElements: 0,
      totalPages: 0
    },
    sort: { field: 'orderDate', direction: 'desc' },
    loading: false,
    error: null,
    kpis: null,
    selectedOrders: [],
    currentTab: OrderStatus.PENDING
  });

  public state$ = this.stateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private loadingStateService: LoadingStateService,
    private errorHandlerService: ErrorHandlerService,
    private authService: AuthService
  ) { }

  // === MÉTHODES D'ÉTAT ===

  /**
   * Met à jour l'état partiel de l'application
   */
  private updateState(partialState: Partial<OrderState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partialState });
  }

  /**
   * Retourne l'état actuel
   */
  getCurrentState(): OrderState {
    return this.stateSubject.value;
  }

  /**
   * Met à jour l'état de chargement
   */
  private setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  /**
   * Met à jour l'état d'erreur
   */
  private setError(error: string | null): void {
    this.updateState({ error, loading: false });
  }

  /**
   * Réinitialise l'état de l'application
   */
  resetState(): void {
    this.stateSubject.next({
      orders: [],
      filteredOrders: [],
      filters: {},
      pagination: {
        page: 0,
        size: ORDER_CONSTANTS.DEFAULT_PAGE_SIZE,
        totalElements: 0,
        totalPages: 0
      },
      sort: { field: 'orderDate', direction: 'desc' },
      loading: false,
      error: null,
      kpis: null,
      selectedOrders: [],
      currentTab: OrderStatus.PENDING
    });
  }

  /**
   * Met à jour l'onglet actuel
   */
  setCurrentTab(tab: OrderStatus | 'ALL'): void {
    this.updateState({
      currentTab: tab as OrderStatus,
      selectedOrders: [] // Reset selection when changing tab
    });
  }

  /**
   * Met à jour la sélection des commandes
   */
  updateSelection(selectedOrders: number[]): void {
    this.updateState({ selectedOrders });
  }

  /**
   * Sélectionne toutes les commandes visibles
   */
  selectAll(): void {
    const currentState = this.stateSubject.value;
    const allIds = currentState.filteredOrders.map(order => order.id);
    this.updateState({ selectedOrders: allIds });
  }

  /**
   * Désélectionne toutes les commandes
   */
  clearSelection(): void {
    this.updateState({ selectedOrders: [] });
  }

  // === HEADERS HTTP AVEC AUTHENTIFICATION ===

  /**
   * Génère les headers HTTP avec authentification JWT
   */
  private getHeaders(): HttpHeaders {
    const token = this.tokenStorage.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // === GESTION DES COMMANDES ===

  /**
   * Récupère la liste des commandes avec filtres et pagination
   */
  getOrders(
    page: number = 0,
    size: number = ORDER_CONSTANTS.DEFAULT_PAGE_SIZE,
    filters: OrderFilters = {},
    sortField: string = 'orderDate',
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Observable<ApiResponse<PaginatedResponse<Order>>> {
    this.setLoading(true);
    this.loadingStateService.setLoading(LOADING_OPERATIONS.FETCH_ORDERS, true);
    const headers = this.getHeaders();

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', `${sortField},${sortDirection}`);

    // Ajout des filtres
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.clientName) {
      params = params.set('clientName', filters.clientName);
    }
    if (filters.commercial) {
      params = params.set('commercial', filters.commercial);
    }
    if (filters.dateFrom) {
      params = params.set('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params = params.set('dateTo', filters.dateTo);
    }
    if (filters.minAmount) {
      params = params.set('minAmount', filters.minAmount.toString());
    }
    if (filters.maxAmount) {
      params = params.set('maxAmount', filters.maxAmount.toString());
    }
    if (filters.searchTerm) {
      params = params.set('search', filters.searchTerm);
    }

    return this.http.get<ApiResponse<PaginatedResponse<any>>>(`${this.apiUrl}`, { headers, params })
      .pipe(
        map(response => ({
          ...response,
          data: response.data ? {
            ...response.data,
            content: this.mapOrdersFromAPI(response.data.content || [])
          } : null
        })),
        tap(response => {
          if (response.statusCode === 200 && response.data) {
            this.updateState({
              orders: response.data.content,
              filteredOrders: response.data.content,
              pagination: {
                page: response.data.number,
                size: response.data.size,
                totalElements: response.data.totalElements,
                totalPages: response.data.totalPages
              },
              filters,
              sort: { field: sortField, direction: sortDirection },
              loading: false,
              error: null
            });
          }
        }),
        catchError(error => this.errorHandlerService.handleHttpError(error, LOADING_OPERATIONS.FETCH_ORDERS)),
        finalize(() => {
          this.setLoading(false);
          this.loadingStateService.setLoading(LOADING_OPERATIONS.FETCH_ORDERS, false);
        })
      );
  }

  /**
   * Récupère les détails d'une commande spécifique
   */
  getOrderById(orderId: number): Observable<ApiResponse<Order>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.get<ApiResponse<Order>>(`${this.apiUrl}/${orderId}`, { headers })
      .pipe(
        tap(() => this.setLoading(false)),
        catchError(this.handleApiError.bind(this))
      );
  }

  /**
   * Crée une nouvelle commande
   */
  createOrder(orderData: CreateOrderDto): Observable<ApiResponse<Order>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.post<ApiResponse<Order>>(`${this.apiUrl}`, orderData, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 201 && response.data) {
            const currentState = this.stateSubject.value;
            const updatedOrders = [...currentState.orders, response.data];
            this.updateState({
              orders: updatedOrders,
              filteredOrders: updatedOrders,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  /**
   * Met à jour une commande existante
   */
  updateOrder(orderId: number, orderData: UpdateOrderDto): Observable<ApiResponse<Order>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.put<ApiResponse<Order>>(`${this.apiUrl}/${orderId}`, orderData, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 200 && response.data) {
            const currentState = this.stateSubject.value;
            const updatedOrders = currentState.orders.map(order =>
              order.id === orderId ? response.data! : order
            );
            this.updateState({
              orders: updatedOrders,
              filteredOrders: updatedOrders,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  /**
   * Supprime une commande
   */
  deleteOrder(orderId: number): Observable<ApiResponse<void>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${orderId}`, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 200) {
            const currentState = this.stateSubject.value;
            const updatedOrders = currentState.orders.filter(order => order.id !== orderId);
            const updatedSelection = currentState.selectedOrders.filter(id => id !== orderId);
            this.updateState({
              orders: updatedOrders,
              filteredOrders: updatedOrders,
              selectedOrders: updatedSelection,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  // === GESTION DES STATUTS ===

  /**
   * Met à jour le statut d'une ou plusieurs commandes
   */
  updateOrdersStatus(statusData: UpdateOrderStatusDto): Observable<ApiResponse<Order[]>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.patch<ApiResponse<Order[]>>(`${this.apiUrl}/status`, statusData, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 200 && response.data) {
            const currentState = this.stateSubject.value;
            const updatedOrdersMap = new Map(response.data.map(order => [order.id, order]));

            const updatedOrders = currentState.orders.map(order =>
              updatedOrdersMap.has(order.id) ? updatedOrdersMap.get(order.id)! : order
            );

            this.updateState({
              orders: updatedOrders,
              filteredOrders: updatedOrders,
              selectedOrders: [], // Clear selection after bulk action
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  /**
   * Transforme une commande acceptée en vente (crédit)
   */
  sellOrder(orderId: number): Observable<ApiResponse<any>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${orderId}/sell`, {}, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 201) {
            // Mettre à jour le statut de la commande à SOLD
            const currentState = this.stateSubject.value;
            const updatedOrders = currentState.orders.map(order =>
              order.id === orderId ? { ...order, status: OrderStatus.SOLD } : order
            );
            this.updateState({
              orders: updatedOrders,
              filteredOrders: updatedOrders,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  // === GESTION DES KPIs ===

  /**
   * Récupère les indicateurs clés de performance
   */
  getKPIs(): Observable<ApiResponse<OrderKPI>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.get<ApiResponse<OrderKPI>>(`${this.apiUrl}/kpis`, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 200 && response.data) {
            this.updateState({
              kpis: response.data,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  // === GESTION DES CLIENTS ET ARTICLES ===

  /**
   * Recherche des clients disponibles
   * Utilise la même API que le composant credit-add
   */
  searchClients(searchTerm: string = ''): Observable<ApiResponse<OrderClient[]>> {
    const headers = this.getHeaders();
    const currentUser = this.authService.getCurrentUser();

    if (searchTerm && searchTerm.trim() !== '') {
      // Utiliser l'API de recherche Elasticsearch comme dans credit-add
      const searchUrl = `${environment.apiUrl}/api/v1/clients/elasticsearch`;
      const body = { keyword: searchTerm.trim() };
      let params = new HttpParams()
        .set('page', '0')
        .set('size', '100')
        .set('sort', 'id,desc');

      return this.http.post<ApiResponse<PaginatedResponse<OrderClient>>>(searchUrl, body, { headers, params })
        .pipe(
          map(response => ({
            ...response,
            data: [...(response.data?.content || [])] as OrderClient[]
          })),
          catchError(this.handleApiError.bind(this))
        );
    } else {
      // Récupérer tous les clients comme dans credit-add
      let params = new HttpParams()
        .set('page', '0')
        .set('size', '10000')
        .set('sort', 'id,desc')
        .set('username', currentUser.username);

      return this.http.get<ApiResponse<PaginatedResponse<OrderClient>>>(`${environment.apiUrl}/api/v1/clients`, { headers, params })
        .pipe(
          map(response => ({
            ...response,
            data: [...(response.data?.content || [])] as OrderClient[]
          })),
          catchError(this.handleApiError.bind(this))
        );
    }
  }

  /**
   * Recherche des articles disponibles
   * Utilise la même API que le composant credit-add
   */
  searchArticles(searchTerm: string = ''): Observable<ApiResponse<OrderArticle[]>> {
    const headers = this.getHeaders();

    if (searchTerm && searchTerm.trim() !== '') {
      // Utiliser l'API de recherche Elasticsearch comme dans credit-add
      const searchUrl = `${environment.apiUrl}/api/v1/articles/elasticsearch/enabled`;
      const body = { keyword: searchTerm.trim() };
      let params = new HttpParams()
        .set('page', '0')
        .set('size', '100')
        .set('sort', 'id,desc');

      return this.http.post<ApiResponse<PaginatedResponse<OrderArticle>>>(searchUrl, body, { headers, params })
        .pipe(
          map(response => ({
            ...response,
            data: [...(response.data?.content || [])] as OrderArticle[]
          })),
          catchError(this.handleApiError.bind(this))
        );
    } else {
      // Récupérer tous les articles comme dans credit-add
      let params = new HttpParams()
        .set('size', '10000');

      return this.http.get<ApiResponse<PaginatedResponse<OrderArticle>>>(`${environment.apiUrl}/api/v1/articles/enabled`, { headers, params })
        .pipe(
          map(response => ({
            ...response,
            data: [...(response.data?.content || [])] as OrderArticle[]
          })),
          catchError(this.handleApiError.bind(this))
        );
    }
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Applique des filtres locaux sur les commandes
   */
  applyLocalFilters(filters: OrderFilters): void {
    const currentState = this.stateSubject.value;
    let filteredOrders = [...currentState.orders];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(order => {
        const clientName = `${order.client?.firstname || ''} ${order.client?.lastname || ''}`.trim();
        const commercial = order.commercial || '';
        return clientName.toLowerCase().includes(searchLower) ||
          commercial.toLowerCase().includes(searchLower) ||
          order.id.toString().includes(searchLower);
      });
    }

    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }

    if (filters.minAmount) {
      filteredOrders = filteredOrders.filter(order => order.totalAmount >= filters.minAmount!);
    }

    if (filters.maxAmount) {
      filteredOrders = filteredOrders.filter(order => order.totalAmount <= filters.maxAmount!);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredOrders = filteredOrders.filter(order => new Date(order.orderDate) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filteredOrders = filteredOrders.filter(order => new Date(order.orderDate) <= toDate);
    }

    this.updateState({
      filteredOrders,
      filters
    });
  }

  /**
   * Charge une page spécifique de commandes
   */
  loadOrdersPage(page: number, size: number): Observable<ApiResponse<Order[]>> {
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'id,desc');

    this.updateState({ loading: true });

    return this.http.get<ApiResponse<PaginatedResponse<any>>>(`${this.apiUrl}`, { headers, params })
      .pipe(
        map(response => ({
          ...response,
          data: this.mapOrdersFromAPI(response.data?.content || [])
        })),
        tap(response => {
          if (response.data) {
            const originalResponse = response as any;
            const pageInfo = originalResponse.data?.page || {};

            this.updateState({
              orders: response.data,
              filteredOrders: response.data,
              pagination: {
                page: pageInfo.number || page,
                size: pageInfo.size || size,
                totalElements: pageInfo.totalElements || 0,
                totalPages: pageInfo.totalPages || 0
              },
              loading: false
            });
          }
        }),
        catchError(error => {
          this.updateState({ loading: false });
          return this.handleApiError(error);
        })
      );
  }

  /**
   * Mappe les données de l'API vers l'interface Order
   */
  private mapOrdersFromAPI(apiOrders: readonly any[]): Order[] {
    return apiOrders.map(apiOrder => ({
      id: apiOrder.id,
      client: {
        id: apiOrder.client?.id || 0,
        firstname: apiOrder.client?.firstname || '',
        lastname: apiOrder.client?.lastname || '',
        fullName: apiOrder.client ? `${apiOrder.client.firstname} ${apiOrder.client.lastname}` : '',
        code: apiOrder.client?.code,
        phone: apiOrder.client?.phone,
        address: apiOrder.client?.address
      },
      orderDate: apiOrder.orderDate,
      totalAmount: apiOrder.totalAmount,
      totalPurchasePrice: apiOrder.totalPurchasePrice,
      status: apiOrder.status as OrderStatus,
      items: apiOrder.items || [],
      commercial: apiOrder.client?.collector || 'Non assigné',
      createdAt: apiOrder.createdAt,
      updatedAt: apiOrder.updatedAt,
      createdBy: apiOrder.createdBy
    }));
  }

  // === GESTION DES ERREURS ===

  /**
   * Gère les erreurs d'API de manière centralisée
   */
  private handleApiError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur inattendue s\'est produite.';

    // Vérifier si l'API a retourné un message d'erreur spécifique
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
    } else {
      // Gérer différents codes de statut HTTP
      switch (error.status) {
        case 400:
          errorMessage = 'Données de commande invalides. Veuillez vérifier votre saisie.';
          break;
        case 401:
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Permissions insuffisantes pour gérer les commandes.';
          break;
        case 404:
          errorMessage = 'Commande non trouvée.';
          break;
        case 409:
          errorMessage = 'Conflit : cette commande ne peut pas être modifiée dans son état actuel.';
          break;
        case 422:
          errorMessage = 'Données non valides. Veuillez corriger les erreurs et réessayer.';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne. Veuillez réessayer plus tard.';
          break;
        case 502:
          errorMessage = 'Service temporairement indisponible. Veuillez réessayer.';
          break;
        case 503:
          errorMessage = 'Service en maintenance. Veuillez réessayer plus tard.';
          break;
        case 504:
          errorMessage = 'Délai d\'attente dépassé. Veuillez réessayer.';
          break;
        case 0:
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
          break;
        default:
          if (error.status >= 500) {
            errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          } else if (error.status >= 400) {
            errorMessage = 'Erreur de requête. Veuillez vérifier vos données.';
          }
      }
    }

    // Logger l'erreur pour le débogage
    console.error('Order API Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });

    // Mettre à jour l'état avec l'erreur
    this.setError(errorMessage);

    return throwError(() => new Error(errorMessage));
  };
}
