import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import {
  TontineSession,
  SessionStats,
  SessionComparison,
  ApiResponse
} from '../types/tontine.types';

@Injectable({
  providedIn: 'root'
})
export class TontineSessionService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/tontines/sessions`;

  private currentSessionSubject = new BehaviorSubject<TontineSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

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

  getAllSessions(): Observable<ApiResponse<TontineSession[]>> {
    const headers = this.getHeaders();
    return this.http.get<ApiResponse<TontineSession[]>>(this.apiUrl, { headers })
      .pipe(catchError(this.handleError));
  }

  getSessionById(sessionId: number): Observable<ApiResponse<TontineSession>> {
    const headers = this.getHeaders();
    return this.http.get<ApiResponse<TontineSession>>(`${this.apiUrl}/${sessionId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  getSessionStats(sessionId: number): Observable<ApiResponse<SessionStats>> {
    const headers = this.getHeaders();
    return this.http.get<ApiResponse<SessionStats>>(`${this.apiUrl}/${sessionId}/stats`, { headers })
      .pipe(catchError(this.handleError));
  }

  compareSessions(years: number[]): Observable<ApiResponse<SessionComparison>> {
    const headers = this.getHeaders();
    return this.http.post<ApiResponse<SessionComparison>>(`${this.apiUrl}/compare`, { years }, { headers })
      .pipe(catchError(this.handleError));
  }

  exportSession(sessionId: number, format: 'excel' | 'pdf'): Observable<Blob> {
    const headers = this.getHeaders();
    const params = new HttpParams().set('format', format);
    
    return this.http.get(`${this.apiUrl}/${sessionId}/export`, {
      headers,
      params,
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  setCurrentSession(session: TontineSession): void {
    this.currentSessionSubject.next(session);
  }

  getCurrentSession(): TontineSession | null {
    return this.currentSessionSubject.value;
  }

  isCurrentSession(session: TontineSession): boolean {
    return session.status === 'ACTIVE';
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inattendue s\'est produite.';

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.status === 404) {
      errorMessage = 'Session non trouvée.';
    }

    console.error('Session API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
