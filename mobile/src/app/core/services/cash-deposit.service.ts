import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CashDepositService {
  private apiUrl = `${environment.apiUrl}/api/cash-deposits`;

  constructor(private http: HttpClient) { }

  getDeposits(startDate: string, endDate: string, commercialUsername?: string, page: number = 0, size: number = 20): Observable<any> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'date,desc');

    if (commercialUsername) {
      params = params.set('commercialUsername', commercialUsername);
    }

    return this.http.get<any>(this.apiUrl, { params });
  }
}
