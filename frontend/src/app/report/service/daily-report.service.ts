import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DailyCommercialReport } from '../models/daily-commercial-report.model';

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
}
