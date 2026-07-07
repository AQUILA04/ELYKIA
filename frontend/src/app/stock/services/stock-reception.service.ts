import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StockReceptionService {
  private apiUrl = `${environment.apiUrl}/api/v1/stock-receptions`;
  private pdfUrl = `${environment.apiUrl}/api/v1/pdf`;

  constructor(private http: HttpClient) { }

  getReceptions(page: number, size: number, reference?: string, receptionDate?: string | null): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (reference) {
      params = params.set('reference', reference);
    }

    if (receptionDate) {
      params = params.set('receptionDate', receptionDate);
    }

    // Determine the endpoint based on search criteria
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

  cancelReception(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
