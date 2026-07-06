import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DailyCommercialReport } from '../models/daily-commercial-report.model';
import { CommercialYearlySummary } from '../models/commercial-yearly-summary.model';

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
