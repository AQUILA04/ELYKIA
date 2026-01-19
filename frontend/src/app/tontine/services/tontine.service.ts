import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap, finalize, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import {
  TontineSession,
  TontineMember,
  TontineCollection,
  TontineClient,
  TontineKPI,
  CreateTontineMemberDto,
  CreateTontineCollectionDto,
  UpdateSessionDto,
  TontineFilters,
  ApiResponse,
  PaginatedResponse,
  TontineState,
  TONTINE_CONSTANTS,
  TontineMemberDeliveryStatus,
  TontineMemberQueryParams,
  SessionStats
} from '../types/tontine.types';
import {AuthService} from "../../auth/service/auth.service";

@Injectable({
  providedIn: 'root'
})
export class TontineService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/tontines`;
  private readonly sessionApiUrl = `${environment.apiUrl}/api/v1/tontines/sessions`;

  private stateSubject = new BehaviorSubject<TontineState>({
    members: [],
    filteredMembers: [],
    filters: {},
    loading: false,
    error: null,
    kpis: null,
    currentSession: null
  });

  public state$ = this.stateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private authService: AuthService
  ) { }

  private updateState(partialState: Partial<TontineState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partialState });
  }

  getCurrentState(): TontineState {
    return this.stateSubject.value;
  }

  private setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  private setError(error: string | null): void {
    this.updateState({ error, loading: false });
  }

  resetState(): void {
    this.stateSubject.next({
      members: [],
      filteredMembers: [],
      filters: {},
      loading: false,
      error: null,
      kpis: null,
      currentSession: null
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.tokenStorage.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getMembers(
    queryParams: TontineMemberQueryParams
  ): Observable<ApiResponse<PaginatedResponse<TontineMember>>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    let params = new HttpParams();
    if (queryParams.page !== undefined) {
      params = params.set('page', queryParams.page.toString());
    }
    if (queryParams.size !== undefined) {
      params = params.set('size', queryParams.size.toString());
    }
    if (queryParams.search) {
      params = params.set('search', queryParams.search);
    }
    if (queryParams.deliveryStatus) {
      params = params.set('deliveryStatus', queryParams.deliveryStatus);
    }
    if (queryParams.sort) {
      params = params.set('sort', queryParams.sort);
    }
    if (queryParams.commercial) {
      params = params.set('commercial', queryParams.commercial);
    }

    return this.http.get<ApiResponse<PaginatedResponse<TontineMember>>>(`${this.apiUrl}/members`, { headers, params })
      .pipe(
        tap(response => {
          if (response.statusCode === 200 && response.data) {
            this.updateState({
              members: response.data.content,
              filteredMembers: response.data.content,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this)),
        finalize(() => this.setLoading(false))
      );
  }

  getMemberById(memberId: number): Observable<ApiResponse<TontineMember>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.get<ApiResponse<TontineMember>>(`${this.apiUrl}/members/${memberId}`, { headers })
      .pipe(
        tap(() => this.setLoading(false)),
        catchError(this.handleApiError.bind(this))
      );
  }

  createMember(memberData: CreateTontineMemberDto): Observable<ApiResponse<TontineMember>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.post<ApiResponse<TontineMember>>(`${this.apiUrl}/members`, memberData, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 201 && response.data) {
            const currentState = this.stateSubject.value;
            const updatedMembers = [...currentState.members, response.data];
            this.updateState({
              members: updatedMembers,
              filteredMembers: updatedMembers,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  addMembersList(dtos: CreateTontineMemberDto[]): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/members/add-list`, dtos, { headers });
  }

  getCollections(memberId: number, page: number = 0, size: number = 50): Observable<ApiResponse<PaginatedResponse<TontineCollection>>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse<PaginatedResponse<TontineCollection>>>(`${this.apiUrl}/members/${memberId}/collections`, { headers, params })
      .pipe(
        tap(() => this.setLoading(false)),
        catchError(this.handleApiError.bind(this))
      );
  }

  createCollection(collectionData: CreateTontineCollectionDto): Observable<ApiResponse<TontineCollection>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.post<ApiResponse<TontineCollection>>(`${this.apiUrl}/collections`, collectionData, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 201 && response.data) {
            const currentState = this.stateSubject.value;
            const updatedMembers = currentState.members.map(member => {
              if (member.id === collectionData.memberId) {
                return {
                  ...member,
                  totalContribution: member.totalContribution + collectionData.amount
                };
              }
              return member;
            });
            this.updateState({
              members: updatedMembers,
              filteredMembers: updatedMembers,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  getCurrentSession(): Observable<ApiResponse<TontineSession>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.get<ApiResponse<TontineSession>>(`${this.sessionApiUrl}/current`, { headers })
      .pipe(
        switchMap(response => {
          if (response.statusCode === 200 && response.data) {
            this.updateState({
              currentSession: response.data,
              loading: false,
              error: null
            });
            // After getting the session, get its stats
            return this.getSessionStats(response.data.id).pipe(
              map(() => response) // Return the original session response
            );
          }
          // If no session data, just return the original response
          return of(response);
        }),
        catchError(this.handleApiError.bind(this)),
        finalize(() => this.setLoading(false))
      );
  }

  getSessionStats(sessionId: number): Observable<ApiResponse<SessionStats>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.get<ApiResponse<SessionStats>>(`${this.sessionApiUrl}/${sessionId}/stats`, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 200 && response.data) {
            const stats = response.data;
            this.updateState({
              kpis: {
                totalMembers: stats.totalMembers,
                totalCollected: stats.totalCollected,
                totalRevenue: stats.totalRevenue,
                pendingDeliveries: stats.pendingCount,
                completedDeliveries: stats.deliveredCount,
                averageContribution: stats.averageContribution,
                monthlyGrowth: 0, // Placeholder
                totalDeliveryCollections: stats.totalDeliveryCollections
              },
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this)),
        finalize(() => this.setLoading(false))
      );
  }

  updateCurrentSession(sessionData: UpdateSessionDto): Observable<ApiResponse<TontineSession>> {
    this.setLoading(true);
    const headers = this.getHeaders();

    return this.http.put<ApiResponse<TontineSession>>(`${this.sessionApiUrl}/current`, sessionData, { headers })
      .pipe(
        tap(response => {
          if (response.statusCode === 200 && response.data) {
            this.updateState({
              currentSession: response.data,
              loading: false,
              error: null
            });
          }
        }),
        catchError(this.handleApiError.bind(this))
      );
  }

  searchClients(searchTerm: string = ''): Observable<ApiResponse<TontineClient[]>> {
    const headers = this.getHeaders();
    const currentUser = this.authService.getCurrentUser();

    if (searchTerm && searchTerm.trim() !== '') {
      const searchUrl = `${environment.apiUrl}/api/v1/clients/elasticsearch`;
      const body = { keyword: searchTerm.trim() };
      let params = new HttpParams()
        .set('page', '0')
        .set('size', '100')
        .set('sort', 'id,desc')
        .set('username', currentUser)
        .set('tontine', true);

      return this.http.post<ApiResponse<PaginatedResponse<TontineClient>>>(searchUrl, body, { headers, params })
        .pipe(
          map(response => ({
            ...response,
            data: [...(response.data?.content || [])] as TontineClient[]
          })),
          catchError(this.handleApiError.bind(this))
        );
    } else {
      let params = new HttpParams()
        .set('page', '0')
        .set('size', '10000')
        .set('sort', 'id,desc')
        .set('username', currentUser.username)
        .set('tontine', true);

      return this.http.get<ApiResponse<PaginatedResponse<TontineClient>>>(`${environment.apiUrl}/api/v1/clients`, { headers, params })
        .pipe(
          map(response => ({
            ...response,
            data: [...(response.data?.content || [])] as TontineClient[]
          })),
          catchError(this.handleApiError.bind(this))
        );
    }
  }

  private handleApiError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur inattendue s\'est produite.';

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides. Veuillez vérifier votre saisie.';
          break;
        case 401:
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Permissions insuffisantes.';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée.';
          break;
        case 409:
          errorMessage = 'Ce client est déjà inscrit à la session en cours.';
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
        case 0:
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
          break;
      }
    }

    console.error('Tontine API Error:', {
      status: error.status,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });

    this.setError(errorMessage);
    return throwError(() => new Error(errorMessage));
  };
}
