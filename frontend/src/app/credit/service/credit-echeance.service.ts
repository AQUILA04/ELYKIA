import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CreditEcheanceService {
  private apiUrl = `${environment.apiUrl}/api/v1/credits/echeance`;

  constructor(private http: HttpClient) {}

  getSummary(collector?: string): Observable<any> {
    let params = new HttpParams();
    if (collector) { params = params.set('collector', collector); }
    return this.http.get<any>(`${this.apiUrl}/summary`, { params });
  }

  getForToday(collector?: string): Observable<any> {
    let params = new HttpParams();
    if (collector) { params = params.set('collector', collector); }
    return this.http.get<any>(`${this.apiUrl}/today`, { params });
  }

  getForWeek(collector?: string): Observable<any> {
    let params = new HttpParams();
    if (collector) { params = params.set('collector', collector); }
    return this.http.get<any>(`${this.apiUrl}/week`, { params });
  }

  getForDate(date: string, collector?: string): Observable<any> {
    let params = new HttpParams().set('date', date);
    if (collector) { params = params.set('collector', collector); }
    return this.http.get<any>(`${this.apiUrl}/date`, { params });
  }

  getCalendar(from: string, to: string, collector?: string): Observable<any> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (collector) { params = params.set('collector', collector); }
    return this.http.get<any>(`${this.apiUrl}/calendar`, { params });
  }

  getCollectors(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/collectors`);
  }
}
