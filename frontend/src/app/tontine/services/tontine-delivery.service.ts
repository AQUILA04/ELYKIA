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
