import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import {
  TontineDelivery,
  CreateDeliveryDto,
  DeliveryItemDto,
  ApiResponse,
  PaginatedResponse,
  TontineMemberDeliveryStatus // Added TontineMemberDeliveryStatus // Added PaginatedResponse
} from '../types/tontine.types';

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
