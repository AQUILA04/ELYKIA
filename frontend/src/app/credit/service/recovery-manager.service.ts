import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreditCloseItemDto, RecoveryOperationsParams, ReportPeriodParams } from '../models/recovery-manager.model';

@Injectable({
  providedIn: 'root'
})
export class RecoveryManagerService {
  private readonly BASE = `${environment.apiUrl}/api/v1/recovery-manager`;

  constructor(private http: HttpClient) {}

  closeCredits(items: CreditCloseItemDto[]): Observable<any> {
    return this.http.post<any>(`${this.BASE}/close-credits`, { items });
  }

  getOperations(params: RecoveryOperationsParams): Observable<any> {
    let httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate);
    if (params.recoveryManagerUsername) {
      httpParams = httpParams.set('recoveryManagerUsername', params.recoveryManagerUsername);
    }
    if (params.commercialUsername) {
      httpParams = httpParams.set('commercialUsername', params.commercialUsername);
    }
    if (params.page != null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size != null) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    return this.http.get<any>(`${this.BASE}/operations`, { params: httpParams });
  }

  getReportSummary(params: ReportPeriodParams): Observable<any> {
    let httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate);
    if (params.recoveryManagerUsername) {
      httpParams = httpParams.set('recoveryManagerUsername', params.recoveryManagerUsername);
    }
    if (params.commercialUsername) {
      httpParams = httpParams.set('commercialUsername', params.commercialUsername);
    }
    return this.http.get<any>(`${this.BASE}/report/summary`, { params: httpParams });
  }

  downloadReportPdf(params: ReportPeriodParams): Observable<Blob> {
    let httpParams = new HttpParams()
      .set('startDate', params.startDate)
      .set('endDate', params.endDate);
    if (params.recoveryManagerUsername) {
      httpParams = httpParams.set('recoveryManagerUsername', params.recoveryManagerUsername);
    }
    if (params.commercialUsername) {
      httpParams = httpParams.set('commercialUsername', params.commercialUsername);
    }
    return this.http.get(`${this.BASE}/report/pdf`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
