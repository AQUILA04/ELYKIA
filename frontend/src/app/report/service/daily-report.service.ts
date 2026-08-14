import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DailyCommercialReport } from '../models/daily-commercial-report.model';
import { CommercialYearlySummary } from '../models/commercial-yearly-summary.model';
import { RemainingAtClientsPage } from '../models/remaining-at-clients.model';
import { CommercialTontineYearlySummary } from '../models/commercial-tontine-yearly-summary.model';

@Injectable({
    providedIn: 'root'
})
export class DailyReportService {
    private apiUrl = `${environment.apiUrl}/api/daily-commercial-reports`;

    constructor(private http: HttpClient) { }

    getReports(startDate: string, endDate: string, collector?: string): Observable<DailyCommercialReport[]> {
        let params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate);

        if (collector) {
            params = params.set('collector', collector);
        }

        return this.http.get<DailyCommercialReport[]>(`${this.apiUrl}/search`, { params });
    }

    getYearlySummary(year: number, collector?: string): Observable<CommercialYearlySummary> {
        let params = new HttpParams().set('year', year);
        if (collector) {
            params = params.set('collector', collector);
        }
        return this.http.get<CommercialYearlySummary>(`${this.apiUrl}/yearly-summary`, { params });
    }

    getYearlyTontineSummary(year: number, collector?: string): Observable<CommercialTontineYearlySummary> {
        let params = new HttpParams().set('year', year);
        if (collector) {
            params = params.set('collector', collector);
        }
        return this.http.get<CommercialTontineYearlySummary>(
            `${this.apiUrl}/yearly-tontine-summary`,
            { params }
        );
    }

    getYearlyRemainingCredits(
        year: number,
        collector: string | undefined,
        page: number,
        size: number
    ): Observable<RemainingAtClientsPage> {
        let params = new HttpParams()
            .set('year', year)
            .set('page', page)
            .set('size', size);
        if (collector) {
            params = params.set('collector', collector);
        }
        return this.http.get<RemainingAtClientsPage>(`${this.apiUrl}/yearly-remaining-credits`, { params });
    }

    exportYearlyRemainingCreditsPdf(year: number, collector?: string): Observable<Blob> {
        let params = new HttpParams().set('year', year);
        if (collector) {
            params = params.set('collector', collector);
        }
        return this.http.get(`${this.apiUrl}/yearly-remaining-credits/export/pdf`, {
            params,
            responseType: 'blob'
        });
    }

    exportPdf(startDate: string, endDate: string, commercialUsername: string): Observable<Blob> {
        let params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate)
            .set('commercialUsername', commercialUsername);

        return this.http.get(`${this.apiUrl}/export/pdf`, {
            params,
            responseType: 'blob'
        });
    }
}
