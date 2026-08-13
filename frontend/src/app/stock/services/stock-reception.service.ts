import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StockReceptionStatus } from '../../core/models/stock-reception.model';

@Injectable({
  providedIn: 'root'
})
export class StockReceptionService {
  private apiUrl = `${environment.apiUrl}/api/v1/stock-receptions`;
  private pdfUrl = `${environment.apiUrl}/api/v1/pdf`;

  constructor(private http: HttpClient) { }

  getReceptions(
    page: number,
    size: number,
    reference?: string,
    receptionDate?: string | null,
    status?: StockReceptionStatus | null
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (reference) {
      params = params.set('reference', reference);
    }

    if (receptionDate) {
      params = params.set('receptionDate', receptionDate);
    }

    if (status) {
      params = params.set('status', status);
    }

    const endpoint = (reference || receptionDate) ? `${this.apiUrl}/search` : this.apiUrl;

    return this.http.get<any>(endpoint, { params });
  }

  getReception(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getReceptionItems(id: number, page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(`${this.apiUrl}/${id}/items`, { params });
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.pdfUrl}/download-reception/${id}`, { responseType: 'blob' });
  }

  validateReception(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/validate`, {});
  }

  refuseReception(id: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/refuse`, { reason: reason ?? null });
  }

  cancelReception(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
