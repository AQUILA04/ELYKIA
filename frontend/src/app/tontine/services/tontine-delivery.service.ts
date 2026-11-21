import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import {
  TontineDelivery,
  CreateDeliveryDto,
  ApiResponse,
  PaginatedResponse,
} from '../types/tontine.types';
import { TontineDeliveryListItem } from '../models/tontine-delivery-list.model';
import { TontineDeliveryConflict, TontineDeliveryConflictOutcome } from '../models/tontine-delivery-conflict.model';

export interface TontineReceiptLine {
  designation: string;
  quantity: string;
  unitPrice?: string;
  lineAmount?: string;
}

export interface TontineReceiptVerification {
  found: boolean;
  message?: string;
  authenticityCode?: string;
  reference?: string;
  clientName?: string;
  clientPhone?: string;
  commercialUsername?: string;
  requestDate?: string;
  statusLabel?: string;
  totalAmount?: string;
  lines?: TontineReceiptLine[];
}

@Injectable({
  providedIn: 'root'
})
export class TontineDeliveryService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/tontines/deliveries`;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.tokenStorage.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  createDelivery(deliveryData: CreateDeliveryDto): Observable<ApiResponse<TontineDelivery>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<TontineDelivery>>(this.apiUrl, deliveryData, { headers })
      .pipe(catchError(this.handleError));
  }

  getDeliveryByMemberId(tontineMemberId: number): Observable<ApiResponse<TontineDelivery>> {
    const headers = this.getHeaders();
    return this.http.get<ApiResponse<TontineDelivery>>(`${this.apiUrl}/member/${tontineMemberId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  validateDelivery(deliveryId: number): Observable<ApiResponse<TontineDelivery>> {
    const headers = this.getHeaders();
    return this.http.patch<ApiResponse<TontineDelivery>>(`${this.apiUrl}/${deliveryId}/validate`, {}, { headers })
      .pipe(catchError(this.handleError));
  }

  getValidatedDeliveries(page: number, size: number): Observable<ApiResponse<PaginatedResponse<TontineDelivery>>> {
    const headers = this.getHeaders();
    return this.http.get<ApiResponse<PaginatedResponse<TontineDelivery>>>(`${this.apiUrl}/validated?page=${page}&size=${size}`, { headers })
      .pipe(catchError(this.handleError));
  }

  updateItems(deliveryId: number, items: CreateDeliveryDto['items']): Observable<ApiResponse<TontineDelivery>> {
    const headers = this.getHeaders();
    return this.http.put<ApiResponse<TontineDelivery>>(`${this.apiUrl}/${deliveryId}/items`, { items }, { headers })
      .pipe(catchError(this.handleError));
  }

  downloadReceipt(deliveryId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${deliveryId}/receipt`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  /** PDF des membres à livrer à une date prévue (commandes non encore remises). */
  downloadPlannedDeliveriesPdf(date: string, commercial?: string | null): Observable<Blob> {
    let params = new HttpParams().set('date', date);
    if (commercial) {
      params = params.set('commercial', commercial);
    }
    return this.http.get(`${this.apiUrl}/planned/pdf`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    });
  }

  verifyReceipt(code: string): Observable<ApiResponse<TontineReceiptVerification>> {
    const headers = this.getHeaders();
    const params = new HttpParams().set('code', code.trim());
    return this.http.get<ApiResponse<TontineReceiptVerification>>(`${this.apiUrl}/verify`, { headers, params })
      .pipe(catchError(this.handleError));
  }

  markDeliveryAsDelivered(deliveryId: number): Observable<ApiResponse<TontineDelivery>> {
    const headers = this.getHeaders();
    return this.http.patch<ApiResponse<TontineDelivery>>(`${this.apiUrl}/${deliveryId}/deliver`, {}, { headers })
      .pipe(catchError(this.handleError));
  }

  getDeliveries(
    dateFrom: string,
    dateTo: string,
    commercial?: string | null,
    search?: string,
    page: number = 0,
    size: number = 10,
    sort: string = 'deliveryDate,desc'
  ): Observable<ApiResponse<PaginatedResponse<TontineDeliveryListItem>>> {
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    if (commercial) {
      params = params.set('commercial', commercial);
    }
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<TontineDeliveryListItem>>>(`${this.apiUrl}/list`, { headers, params })
      .pipe(catchError(this.handleError));
  }

  /** Journal des doublons : secondes commandes ou livraisons saisies pour un même membre. */
  getConflicts(
    dateFrom: string,
    dateTo: string,
    commercial?: string | null,
    outcome?: TontineDeliveryConflictOutcome | null,
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse<PaginatedResponse<TontineDeliveryConflict>>> {
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo)
      .set('page', page.toString())
      .set('size', size.toString());
    if (commercial) {
      params = params.set('commercial', commercial);
    }
    if (outcome) {
      params = params.set('outcome', outcome);
    }
    return this.http.get<ApiResponse<PaginatedResponse<TontineDeliveryConflict>>>(`${this.apiUrl}/conflicts`, { headers, params })
      .pipe(catchError(this.handleError));
  }

  getDeliveryKpis(
    dateFrom: string,
    dateTo: string,
    commercial?: string | null,
    search?: string
  ): Observable<ApiResponse<any>> {
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo);

    if (commercial) {
      params = params.set('commercial', commercial);
    }
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/summary`, { headers, params })
      .pipe(catchError(this.handleError));
  }

  elasticSearchDeliveries(
    keyword: string,
    dateFrom: string,
    dateTo: string,
    commercial?: string | null,
    page: number = 0,
    size: number = 10,
    sort: string = 'deliveryDate,desc'
  ): Observable<ApiResponse<PaginatedResponse<TontineDeliveryListItem>>> {
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    if (commercial) {
      params = params.set('commercial', commercial);
    }

    return this.http.post<ApiResponse<PaginatedResponse<TontineDeliveryListItem>>>(
      `${this.apiUrl}/elasticsearch`,
      { keyword },
      { headers, params }
    ).pipe(catchError(this.handleError));
  }

  countPending(
    dateFrom: string,
    dateTo: string,
    commercial?: string | null,
    search?: string
  ): Observable<ApiResponse<{ count: number }>> {
    return this.http.get<ApiResponse<{ count: number }>>(
      `${this.apiUrl}/pending-count`,
      { headers: this.getHeaders(), params: this.filterParams(dateFrom, dateTo, commercial, search) }
    ).pipe(catchError(this.handleError));
  }

  validateSelection(deliveryIds: number[]): Observable<ApiResponse<{ count: number }>> {
    return this.http.post<ApiResponse<{ count: number }>>(
      `${this.apiUrl}/validate-selection`,
      { deliveryIds },
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  validatePending(
    dateFrom: string,
    dateTo: string,
    commercial?: string | null,
    search?: string
  ): Observable<ApiResponse<{ count: number }>> {
    return this.http.post<ApiResponse<{ count: number }>>(
      `${this.apiUrl}/validate-pending`,
      {},
      { headers: this.getHeaders(), params: this.filterParams(dateFrom, dateTo, commercial, search) }
    ).pipe(catchError(this.handleError));
  }

  private filterParams(
    dateFrom: string,
    dateTo: string,
    commercial?: string | null,
    search?: string
  ): HttpParams {
    let params = new HttpParams().set('dateFrom', dateFrom).set('dateTo', dateTo);
    if (commercial) {
      params = params.set('commercial', commercial);
    }
    if (search) {
      params = params.set('search', search);
    }
    return params;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inattendue s\'est produite.';

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.status === 400) {
      errorMessage = 'Données invalides. Veuillez vérifier votre saisie.';
    } else if (error.status === 404) {
      errorMessage = 'Membre non trouvé.';
    } else if (error.status === 409) {
      errorMessage = 'Ce membre a déjà une livraison enregistrée.';
    }

    console.error('Delivery API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
