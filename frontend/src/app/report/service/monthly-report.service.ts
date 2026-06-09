import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MonthlyReportService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/monthly-reports`;

  constructor(private readonly http: HttpClient) {}

  getTree(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  download(fileId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${fileId}/download`, { responseType: 'blob' });
  }

  generate(year?: number, month?: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate`, { year, month });
  }

  getRuns(page = 0, size = 20): Observable<any> {
    return this.http.get(`${this.baseUrl}/runs?page=${page}&size=${size}`);
  }
}
