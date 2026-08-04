import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CollectorTransferFilters } from '../models/collector-transfer.model';

@Injectable({
  providedIn: 'root'
})
export class CollectorTransferService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/credits/collector-transfers`;

  constructor(private readonly http: HttpClient) {}

  getSummary(filters: CollectorTransferFilters = {}): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary`, { params: this.buildParams(filters) });
  }

  getDetails(filters: CollectorTransferFilters = {}): Observable<any> {
    return this.http.get<any>(this.apiUrl, { params: this.buildParams(filters) });
  }

  private buildParams(filters: CollectorTransferFilters): HttpParams {
    let params = new HttpParams();
    if (filters.oldCollector) {
      params = params.set('oldCollector', filters.oldCollector);
    }
    if (filters.newCollector) {
      params = params.set('newCollector', filters.newCollector);
    }
    if (filters.fromDate) {
      params = params.set('fromDate', filters.fromDate);
    }
    if (filters.toDate) {
      params = params.set('toDate', filters.toDate);
    }
    return params;
  }
}
