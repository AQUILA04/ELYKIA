import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CashDepositService {
    private apiUrl = `${environment.apiUrl}/api/cash-deposits`;
    private operationsUrl = `${environment.apiUrl}/api/daily-operations`;

    constructor(private http: HttpClient) { }

    createDeposit(deposit: any): Observable<any> {
        return this.http.post(this.apiUrl, deposit);
    }

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

    getOperations(date: string, commercialUsername?: string): Observable<any> {
        let params: any = { date };
        if (commercialUsername) {
            params.commercialUsername = commercialUsername;
        }
        return this.http.get<any>(this.operationsUrl, { params });
    }
}
