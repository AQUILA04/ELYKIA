import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccountingDayService {
  private apiUrl = `${environment.apiUrl}/api/v1/accounting-days`; 
                   
  constructor(private http: HttpClient, private tokenStorage : TokenStorageService) { }

  getHeader(){
    const token = this.tokenStorage.getToken(); 
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}` 
    });
    return headers;
  }

  isDayOpened(): Observable<any> {
    const headers= this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/is-opened`, {headers}).pipe(
      catchError(this.handleError)
    );
  }

  openDay(date: string): Observable<any> {
    const headers= this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/open`, {headers}).pipe(
      catchError(this.handleError)
    );
  }

  closeDay(date: string): Observable<any> {
    const headers= this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/close`, {headers}).pipe(
      catchError(this.handleError)
    );
  }
  getCurrentDay(): Observable<any> {
    const headers= this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/current`);
  }

  getOpenCashDesks(): Observable<any> {
    const headers = this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/open-cash-desks`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      errorMessage = `Erreur ${error.status}: ${error.message}`;
    }

    return throwError(errorMessage);
  }
}
