import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/api/v1/reports`;

  constructor(private http: HttpClient, 
    private tokenStorage : TokenStorageService
  ) {}

  getHeader(){
    const token = this.tokenStorage.getToken(); 
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}` 
    });
    return headers;
  }


  // getTotalAmountByPeriod(dateFrom: string, dateTo: string): Observable<any> {
  //   let params = new HttpParams().set('startDate', dateFrom).set('endDate', dateTo);
  //   return this.http.get(`${this.apiUrl}/total-amount-by-period`, { params });
  // }
  getTotalAmountByPeriod(period: string): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}/total-amount-by-period?period=${period}`, {headers});
  }


  getReportByCollector(period: string): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}/by-collector?period=${period}`, {headers});
  }
}