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

  getLateCredits(collector?: string): Observable<any> {
    let params = new HttpParams();
    if (collector) {
      params = params.set('collector', collector);
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  getSummary(collector?: string): Observable<any> {
    let params = new HttpParams();
    if (collector) {
      params = params.set('collector', collector);
    }
    return this.http.get<any>(`${this.apiUrl}/summary`, { params });
  }

  getCollectors(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/collectors`);
  }
}
