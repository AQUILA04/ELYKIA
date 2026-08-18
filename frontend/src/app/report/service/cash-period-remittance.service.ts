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

    getSummary(year: number, month: number, startDate?: string, endDate?: string): Observable<CashPeriodRemittanceSummary> {
        let params = new HttpParams().set('year', year).set('month', month);
        if (startDate) {
            params = params.set('startDate', startDate);
        }
        if (endDate) {
            params = params.set('endDate', endDate);
        }
        return this.http.get<CashPeriodRemittanceSummary>(`${this.apiUrl}/summary`, { params });
    }

    submit(
        year: number,
        month: number,
        expenseIds: number[] = [],
        startDate?: string,
        endDate?: string
    ): Observable<CashPeriodRemittance> {
        return this.http.post<CashPeriodRemittance>(`${this.apiUrl}/submit`, {
            year, month, expenseIds, startDate, endDate
        });
    }

    acknowledge(id: number, expenseIds?: number[]): Observable<CashPeriodRemittance> {
        const body = expenseIds != null ? { expenseIds } : {};
        return this.http.post<CashPeriodRemittance>(`${this.apiUrl}/${id}/acknowledge`, body);
    }

    initiate(
        year: number,
        month: number,
        expenseIds: number[] = [],
        startDate?: string,
        endDate?: string
    ): Observable<CashPeriodRemittance> {
        return this.http.post<CashPeriodRemittance>(`${this.apiUrl}/initiate`, {
            year, month, expenseIds, startDate, endDate
        });
    }

    list(page: number = 0, size: number = 10): Observable<any> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', 'id,desc');
        return this.http.get<any>(this.apiUrl, { params });
    }
}
