import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import { ErrorHandlerService } from './error-handler.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseHttpService {
  protected baseUrl = environment.apiUrl;

  constructor(
    protected http: HttpClient,
    protected tokenStorage: TokenStorageService,
    protected errorHandler: ErrorHandlerService
  ) { }

  /**
   * Génère les headers avec le token d'authentification
   */
  protected getAuthHeaders(): HttpHeaders {
    const token = this.tokenStorage.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Gestionnaire d'erreur amélioré qui préserve le message complet du backend
   */
  protected handleError = (error: HttpErrorResponse): Observable<never> => {
    // Log l'erreur pour debug (sans informations sensibles)
    console.error('HTTP Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: this.errorHandler.getErrorMessage(error),
      timestamp: new Date().toISOString()
    });

    // Retourner l'erreur complète pour que les composants puissent l'utiliser
    return throwError(() => error);
  }

  /**
   * Méthode utilitaire pour extraire le message d'erreur
   */
  protected getErrorMessage(error: HttpErrorResponse): string {
    return this.errorHandler.getErrorMessage(error);
  }

  /**
   * Méthode utilitaire pour afficher une erreur
   */
  protected showError(error: HttpErrorResponse, customTitle?: string): void {
    this.errorHandler.showError(error, customTitle);
  }

  /**
   * Méthodes HTTP de base avec gestion d'erreur améliorée
   */
  protected get<T>(url: string, options?: any): Observable<T> {
    const headers = this.getAuthHeaders();
    const httpOptions = {
      headers,
      observe: 'body' as const,
      responseType: 'json' as const,
      ...options
    };
    return this.http.get<T>(url, httpOptions as any).pipe(
      catchError(this.handleError)
    ) as Observable<T>;
  }

  protected post<T>(url: string, body: any, options?: any): Observable<T> {
    const headers = this.getAuthHeaders();
    const httpOptions = {
      headers,
      observe: 'body' as const,
      responseType: 'json' as const,
      ...options
    };
    return this.http.post<T>(url, body, httpOptions as any).pipe(
      catchError(this.handleError)
    ) as Observable<T>;
  }

  protected put<T>(url: string, body: any, options?: any): Observable<T> {
    const headers = this.getAuthHeaders();
    const httpOptions = {
      headers,
      observe: 'body' as const,
      responseType: 'json' as const,
      ...options
    };
    return this.http.put<T>(url, body, httpOptions as any).pipe(
      catchError(this.handleError)
    ) as Observable<T>;
  }

  protected patch<T>(url: string, body: any, options?: any): Observable<T> {
    const headers = this.getAuthHeaders();
    const httpOptions = {
      headers,
      observe: 'body' as const,
      responseType: 'json' as const,
      ...options
    };
    return this.http.patch<T>(url, body, httpOptions as any).pipe(
      catchError(this.handleError)
    ) as Observable<T>;
  }

  protected delete<T>(url: string, options?: any): Observable<T> {
    const headers = this.getAuthHeaders();
    const httpOptions = {
      headers,
      observe: 'body' as const,
      responseType: 'json' as const,
      ...options
    };
    return this.http.delete<T>(url, httpOptions as any).pipe(
      catchError(this.handleError)
    ) as Observable<T>;
  }
}