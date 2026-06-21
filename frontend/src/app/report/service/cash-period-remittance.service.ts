import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CashPeriodRemittance, CashPeriodRemittanceSummary } from '../models/cash-period-remittance.model';

@Injectable({
    providedIn: 'root'
})
export class CashPeriodRemittanceService {
    private apiUrl = `${environment.apiUrl}/api/cash-period-remittances`;

    constructor(private http: HttpClient) { }

    getSummary(year: number, month: number): Observable<CashPeriodRemittanceSummary> {
        const params = new HttpParams().set('year', year).set('month', month);
        return this.http.get<CashPeriodRemittanceSummary>(`${this.apiUrl}/summary`, { params });
    }

    submit(year: number, month: number): Observable<CashPeriodRemittance> {
        return this.http.post<CashPeriodRemittance>(`${this.apiUrl}/submit`, { year, month });
    }

    acknowledge(id: number): Observable<CashPeriodRemittance> {
        return this.http.post<CashPeriodRemittance>(`${this.apiUrl}/${id}/acknowledge`, {});
    }

    initiate(year: number, month: number): Observable<CashPeriodRemittance> {
        return this.http.post<CashPeriodRemittance>(`${this.apiUrl}/initiate`, { year, month });
    }

    list(page: number = 0, size: number = 20): Observable<any> {
        const params = new HttpParams()
            .set('page', page)
            .set('size', size)
            .set('sort', 'year,desc');
        return this.http.get<any>(this.apiUrl, { params });
    }
}
