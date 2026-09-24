import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  SaleCancellationExecuteRequest,
  SaleCancellationFilter,
  SaleCancellationPreview,
  SaleCancellationRun
} from '../models/sale-cancellation.model';

@Injectable({
  providedIn: 'root'
})
export class SaleCancellationService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/sales/cancellation`;

  constructor(private readonly http: HttpClient) {}

  preview(filter: SaleCancellationFilter): Observable<SaleCancellationPreview> {
    return this.http.post<SaleCancellationPreview>(`${this.baseUrl}/preview`, filter);
  }

  execute(request: SaleCancellationExecuteRequest): Observable<SaleCancellationRun> {
    return this.http.post<SaleCancellationRun>(`${this.baseUrl}/execute`, request);
  }

  getRuns(page = 0, size = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<any>(`${this.baseUrl}/runs`, { params });
  }

  getRunDetails(runId: number): Observable<SaleCancellationRun> {
    return this.http.get<SaleCancellationRun>(`${this.baseUrl}/runs/${runId}`);
  }

  downloadFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/${fileId}/download`, {
      responseType: 'blob'
    });
  }
}
