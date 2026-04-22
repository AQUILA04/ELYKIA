import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ApiResponse, CashDeskStatusResponse } from '../../models/api-sync-response.model';

@Injectable({
  providedIn: 'root'
})
export class CashDeskService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Vérifie et ouvre la caisse si nécessaire.
   * Cette méthode est utilisée comme pré-requis pour la synchronisation.
   */
  async checkAndOpenCashDesk(): Promise<void> {
    try {
      const isOpened = await firstValueFrom(this.checkCashDeskStatus());
      if (!isOpened) {
        await firstValueFrom(this.openCashDesk());
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de caisse:', error);
      throw new Error('Impossible de vérifier ou d\'ouvrir la caisse');
    }
  }

  /**
   * Vérifie si la caisse est ouverte
   */
  checkCashDeskStatus(): Observable<boolean> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/cash-desks/is-opened`, { headers })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Ouvre la caisse
   */
  openCashDesk(): Observable<CashDeskStatusResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<ApiResponse<CashDeskStatusResponse>>(`${this.baseUrl}/api/v1/cash-desks/open`, { headers })
      .pipe(
        map(response => {
          if (!response.data.isOpened) {
            throw new Error(response.message || 'Impossible d\'ouvrir la caisse');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  private getAuthHeaders(): HttpHeaders {
    const user = this.authService.currentUser;
    const token = user?.accessToken;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError = (error: any): Observable<never> => {
    console.error('Erreur API (CashDesk):', error);
    return throwError(error);
  };
}
