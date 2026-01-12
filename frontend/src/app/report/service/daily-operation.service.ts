import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DailyOperationLog } from '../models/daily-operation-log.model';

@Injectable({
    providedIn: 'root'
})
export class DailyOperationService {
    private operationsUrl = `${environment.apiUrl}/api/daily-operations`;

    constructor(private http: HttpClient) { }

    getOperations(startDate: string, endDate: string, commercialUsername?: string, page: number = 0, size: number = 20): Observable<any> {
        let params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate)
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', 'timestamp,desc');

        if (commercialUsername) {
            params = params.set('commercialUsername', commercialUsername);
        }

        return this.http.get<any>(this.operationsUrl, { params });
    }
}
