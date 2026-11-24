import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DailyCommercialReport } from '../models/daily-commercial-report.model';
import { CommercialYearlySummary } from '../models/commercial-yearly-summary.model';
import { RemainingAtClientsPage } from '../models/remaining-at-clients.model';
import { CommercialTontineYearlySummary } from '../models/commercial-tontine-yearly-summary.model';

export interface CashSalesRegisterEntryDto {
    id: number;
    sessionId: number;
    entryType: 'RECEIPT' | 'REVERSAL';
    amount: number;
    signedAmount: number;
    saleId?: number;
    saleReference?: string;
    clientId?: number;
    clientName?: string;
    collector?: string;
    performedBy: string;
    accountingDate: string;
    occurredAt: string;
    notes?: string;
}

export interface CashSalesRegisterSessionDto {
    id: number;
    sessionDate: string;
    cashierUsername: string;
    status: 'OPEN' | 'CLOSED';
    openingFloat: number;
    totalReceipts: number;
    totalReversals: number;
    receiptsCount: number;
    reversalsCount: number;
    expectedClosing: number;
    countedClosing?: number;
    discrepancy?: number;
    closingNotes?: string;
    openedAt: string;
    closedAt?: string;
    closedBy?: string;
}

export interface CashSalesRegisterSummaryDto {
    startDate: string;
    endDate: string;
    sessionsCount: number;
    openSessionsCount: number;
    receiptsCount: number;
    reversalsCount: number;
    totalOpeningFloat: number;
    totalReceipts: number;
    totalReversals: number;
    netSalesAmount: number;
    totalDiscrepancy: number;
    sessions: CashSalesRegisterSessionDto[];
    entries: CashSalesRegisterEntryDto[];
}

@Injectable({
    providedIn: 'root'
})
export class DailyReportService {
    private apiUrl = `${environment.apiUrl}/api/daily-commercial-reports`;
    private registerUrl = `${environment.apiUrl}/api/v1/cash-sales-register`;

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

    getCashRegisterSummary(startDate: string, endDate: string): Observable<CashSalesRegisterSummaryDto> {
        const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
        return this.http.get<CashSalesRegisterSummaryDto>(`${this.apiUrl}/cash-register-summary`, { params });
    }

    openCashRegisterSession(openingFloat: number): Observable<CashSalesRegisterSessionDto> {
        return this.http.post<CashSalesRegisterSessionDto>(`${this.registerUrl}/open`, { openingFloat });
    }

    closeCashRegisterSession(countedClosing?: number, closingNotes?: string): Observable<CashSalesRegisterSessionDto> {
        return this.http.post<CashSalesRegisterSessionDto>(`${this.registerUrl}/close`, { countedClosing, closingNotes });
    }
}
