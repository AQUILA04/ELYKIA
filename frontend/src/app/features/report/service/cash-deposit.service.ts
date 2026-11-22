import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { CatchupCashAdjustment, normalizeCatchupCashAdjustment } from '../models/cash-synthesis';
import { SurplusReallocation, SurplusReallocationOptions } from '../models/surplus-reallocation.model';
import { CashDepositTotals } from '../models/deposit-display';

@Injectable({
    providedIn: 'root'
})
export class CashDepositService {
    private apiUrl = `${environment.apiUrl}/api/cash-deposits`;
    private operationsUrl = `${environment.apiUrl}/api/daily-operations`;

    constructor(private http: HttpClient) { }

    getCatchupCashAdjustment(startDate: string, endDate: string): Observable<CatchupCashAdjustment> {
        const params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate);
        return this.http.get<Partial<CatchupCashAdjustment>>(`${this.apiUrl}/catchup-cash-adjustment`, { params }).pipe(
            map(body => normalizeCatchupCashAdjustment(body))
        );
    }

    previewCatchupAllocation(commercialUsername: string, date: string): Observable<any> {
        const params = new HttpParams()
            .set('commercialUsername', commercialUsername)
            .set('date', date);
        return this.http.get<any>(`${this.apiUrl}/catchup-allocation`, { params });
    }

    createDeposit(deposit: any): Observable<any> {
        return this.http.post(this.apiUrl, deposit);
    }

    cancelDeposit(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/cancel`, {});
    }

    previewReallocateSurplus(
        commercialUsername: string,
        startDate: string,
        endDate: string,
        options: SurplusReallocationOptions
    ): Observable<SurplusReallocation> {
        let params = new HttpParams()
            .set('commercialUsername', commercialUsername)
            .set('startDate', startDate)
            .set('endDate', endDate)
            .set('includeNewBalance', String(options.includeNewBalance));
        for (const date of options.priorityDates || []) {
            params = params.append('priorityDates', date);
        }
        return this.http.get<SurplusReallocation>(`${this.apiUrl}/reallocate-surplus/preview`, { params });
    }

    reallocateSurplus(
        commercialUsername: string,
        startDate: string,
        endDate: string,
        options: SurplusReallocationOptions
    ): Observable<SurplusReallocation> {
        return this.http.post<SurplusReallocation>(`${this.apiUrl}/reallocate-surplus`, {
            commercialUsername,
            startDate,
            endDate,
            includeNewBalance: options.includeNewBalance,
            priorityDates: options.priorityDates
        });
    }

    getSurplusReallocations(commercialUsername: string, startDate: string, endDate: string): Observable<SurplusReallocation[]> {
        const params = new HttpParams()
            .set('commercialUsername', commercialUsername)
            .set('startDate', startDate)
            .set('endDate', endDate);
        return this.http.get<SurplusReallocation[]>(`${this.apiUrl}/surplus-reallocations`, { params });
    }

    getDeposits(startDate: string, endDate: string, commercialUsername?: string, page: number = 0, size: number = 20,
        surplusOnly = false): Observable<any> {
        let params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate)
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', 'date,desc');

        if (commercialUsername) {
            params = params.set('commercialUsername', commercialUsername);
        }
        if (surplusOnly) {
            params = params.set('surplusOnly', 'true');
        }

        return this.http.get<any>(this.apiUrl, { params });
    }

    /** Totaux des versements d'une période, par compte (une requête). */
    getTotals(startDate: string, endDate: string, commercialUsername?: string | null): Observable<CashDepositTotals> {
        let params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
        if (commercialUsername) {
            params = params.set('commercialUsername', commercialUsername);
        }
        return this.http.get<CashDepositTotals>(`${this.apiUrl}/totals`, { params });
    }

    getOperations(date: string, commercialUsername?: string): Observable<any> {
        let params: any = { date };
        if (commercialUsername) {
            params.commercialUsername = commercialUsername;
        }
        return this.http.get<any>(this.operationsUrl, { params });
    }
}
