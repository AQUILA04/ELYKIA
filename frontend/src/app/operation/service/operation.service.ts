import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperationService {
  private apiUrl = `${environment.apiUrl}/api/v1/agency-daily-reports`;

  constructor(private http: HttpClient, 
    private tokenStorage : TokenStorageService
  ) {}

  getHeader(){
    const token = this.tokenStorage.getToken(); 
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}` 
    });
    return headers;
  }


  getOperation(page: number, size: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}?page=${page}&size=${size}`, {headers});
  }


  getAllOperation(): Observable<any[]> {
    const headers= this.getHeader();
    return this.http.get<any[]>(`${this.apiUrl}/all`, {headers});
  }


  getOperationById(id: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, {headers});
  }


  addOperation(gestionData: any): Observable<HttpResponse<any>> {
    const headers= this.getHeader();
    return this.http.post<any>(this.apiUrl, gestionData, { observe: 'response', headers }).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }


  updateOperation(id: number, gestionData: any): Observable<any> {
    const headers= this.getHeader();
    return this.http.put<any>(`${this.apiUrl}/${id}`, gestionData, {headers}).pipe(
      catchError(this.handleError)
    );
  }


  deleteOperation(id: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.delete(`${this.apiUrl}/${id}`, {headers}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}