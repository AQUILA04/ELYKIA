import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, throwError, catchError } from 'rxjs';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  service: string;
  data: T; 
}

export interface Agency {
  id: number;
  name: string;
  code: string;
  phone: string;
  secretaryName: string;
  secretaryContact: string;
  superviserName: string;
  superviserContact: string;
}

export interface AgencyResponseData {
  content: Agency[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}


@Injectable({
  providedIn: 'root'
})
export class GestionService {
  private apiUrl = `${environment.apiUrl}/api/v1/agencies`;

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

  getGestion(page: number, size: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}?page=${page}&size=${size}`, {headers});
  }

  getAllGestion(): Observable<ApiResponse<AgencyResponseData>> {
    const headers= this.getHeader();
    return this.http.get<ApiResponse<AgencyResponseData>>(this.apiUrl, {headers});
  }

  getGestionById(id: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.get<any>(`${this.apiUrl}/${id}`, {headers});
  }

  addGestion(gestionData: any): Observable<HttpResponse<any>> {
    const headers= this.getHeader();
    return this.http.post<any>(this.apiUrl, gestionData, { observe: 'response' , headers}).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  updateGestion(id: number, gestionData: any): Observable<any> {
    const headers= this.getHeader();
    return this.http.put<any>(`${this.apiUrl}/${id}`, gestionData, {headers}).pipe(
      catchError(this.handleError)
    );
  }

  deleteGestion(id: number): Observable<any> {
    const headers= this.getHeader();
    return this.http.delete(`${this.apiUrl}/${id}`, {headers}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
