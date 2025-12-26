import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommercialService {
  private apiUrl = environment.apiUrl;
  private baseUrl = `${this.apiUrl}/api/v1/prometers`;
  private creditsUrl = `${this.apiUrl}/api/v1/credits`; // Add the credits URL her

  constructor(private http: HttpClient) { }

  getCommercials(page: number, size: number): Observable<any> {
    return this.http.get(`${this.baseUrl}?page=${page}&size=${size}`);
  }

  getCommercialById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  createCommercial(commercial: any): Observable<any> {
    return this.http.post(this.baseUrl, commercial);
  }

  updateCommercial(id: number, commercial: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, commercial);
  }

  deleteCommercial(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getCommercialDetailsById(id: number): Observable<any> {
    return this.http.get(`${this.creditsUrl}/commercial-details/${id}`);
  }


}