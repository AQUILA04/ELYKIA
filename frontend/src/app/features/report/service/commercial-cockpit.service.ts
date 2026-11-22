import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CommercialCockpit, CommercialReportSummary, TeamYearlySummary } from '../models/commercial-cockpit.model';

/** API du nouveau rapport commerciaux (cockpit, fiche, portefeuille équipe). */
@Injectable({ providedIn: 'root' })
export class CommercialCockpitService {
    private readonly apiUrl = `${environment.apiUrl}/api/daily-commercial-reports`;

    constructor(private http: HttpClient) { }

    getCockpit(startDate: string, endDate: string, commercial?: string | null, compare = true): Observable<CommercialCockpit> {
        let params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate)
            .set('compare', String(compare));
        if (commercial) {
            params = params.set('collector', commercial);
        }
        return this.http.get<CommercialCockpit>(`${this.apiUrl}/cockpit`, { params });
    }

    getCommercialSummary(commercial: string, startDate: string, endDate: string): Observable<CommercialReportSummary> {
        const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
        return this.http.get<CommercialReportSummary>(
            `${this.apiUrl}/commercials/${encodeURIComponent(commercial)}/summary`, { params });
    }

    getTeamYearlySummary(year: number): Observable<TeamYearlySummary> {
        return this.http.get<TeamYearlySummary>(`${this.apiUrl}/yearly-summary/team`, {
            params: new HttpParams().set('year', year)
        });
    }
}
