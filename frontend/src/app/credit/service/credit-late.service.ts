import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CreditLateService {
  private apiUrl = `${environment.apiUrl}/api/v1/credits/late`;

  constructor(private http: HttpClient) {}

  getLateCredits(collector?: string, month?: number): Observable<any> {
    let params = new HttpParams();
    if (collector) {
      params = params.set('collector', collector);
    }
    if (month) {
      params = params.set('month', month.toString());
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  getSummary(collector?: string, month?: number): Observable<any> {
    let params = new HttpParams();
    if (collector) {
      params = params.set('collector', collector);
    }
    if (month) {
      params = params.set('month', month.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/summary`, { params });
  }

  getCollectors(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/collectors`);
  }

  exportPdf(collector?: string, month?: number, type?: string): Observable<Blob> {
    let params = new HttpParams();
    if (collector) params = params.set('collector', collector);
    if (month) params = params.set('month', month.toString());
    if (type) params = params.set('type', type);
    return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' });
  }
}
