import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecouvrementService {
  private apiUrl = `${environment.apiUrl}/api/v1/recouvrements`;

  constructor(private http: HttpClient) {}

  getRecouvrements(dateFrom: string, dateTo: string, collector?: string, page: number = 0, size: number = 500): Observable<any> {
    let params = new HttpParams()
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo)
      .set('page', page.toString())
      .set('size', size.toString());

    if (collector && collector !== 'all') {
      params = params.set('collector', collector);
    }
    
    return this.http.get<any>(this.apiUrl, { params });
  }

  getSummary(dateFrom: string, dateTo: string, collector?: string): Observable<any> {
    let params = new HttpParams()
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo);

    if (collector && collector !== 'all') {
      params = params.set('collector', collector);
    }
    
    return this.http.get<any>(`${this.apiUrl}/summary`, { params });
  }
}
