import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './credit.service';

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface FormerTontineMember {
  memberId: number;
  sessionYear: number;
  clientId: number;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  ownCollectionsTotal: number;
  ownCollectionsCount: number;
}

export interface FormerTontineCollection {
  memberId: number;
  id: number;
  amount: number;
  collectionDate: string;
  reference: string;
}

export interface FormerTontineMemberDetail extends Omit<FormerTontineMember, 'ownCollectionsCount'> {
  collections: FormerTontineCollection[];
}

export interface FormerCreditItem {
  creditId: number;
  reference: string;
  clientId: number;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  beginDate: string;
  handoverDate: string | null;
  totalAmountAtHandover: number | null;
  totalPaidAtHandover: number | null;
  totalRemainingAtHandover: number | null;
  ownRecoveriesTotal: number;
}

export interface FormerCreditTimeline {
  creditId: number;
  id: number;
  amount: number;
  operationDate: string;
  reference: string;
}

export interface FormerCreditDetail extends FormerCreditItem {
  timelines: FormerCreditTimeline[];
}

export interface FormerAgencySale {
  creditId: number;
  reference: string;
  clientId: number;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  saleDate: string;
  totalAmount: number;
}

export interface FormerAgencyClient {
  clientId: number;
  clientCode: string;
  firstname: string;
  lastname: string;
  phone: string;
  quarter: string;
  ownSalesTotal: number;
  sales: FormerAgencySale[];
}

@Injectable({ providedIn: 'root' })
export class FormerPortfolioService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/former-portfolio`;

  constructor(private readonly http: HttpClient) {}

  listTontine(page: number, size: number): Observable<SpringPage<FormerTontineMember>> {
    return this.getPage<FormerTontineMember>('/tontine/members', page, size);
  }

  tontineMember(memberId: number): Observable<FormerTontineMemberDetail> {
    return this.getOne<FormerTontineMemberDetail>(`/tontine/members/${memberId}`);
  }

  listCredits(page: number, size: number): Observable<SpringPage<FormerCreditItem>> {
    return this.getPage<FormerCreditItem>('/credits', page, size);
  }

  credit(creditId: number): Observable<FormerCreditDetail> {
    return this.getOne<FormerCreditDetail>(`/credits/${creditId}`);
  }

  listAgency(page: number, size: number): Observable<SpringPage<FormerAgencyClient>> {
    return this.getPage<FormerAgencyClient>('/agency', page, size);
  }

  agencyClient(clientId: number): Observable<FormerAgencyClient> {
    return this.getOne<FormerAgencyClient>(`/agency/${clientId}`);
  }

  private getPage<T>(path: string, page: number, size: number): Observable<SpringPage<T>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<SpringPage<T>>>(`${this.apiUrl}${path}`, { params }).pipe(
      map(response => response.data ?? { content: [], totalElements: 0, totalPages: 0, number: page, size })
    );
  }

  private getOne<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}${path}`).pipe(
      map(response => {
        if (!response.data) {
          throw new Error(response.message || 'Dossier introuvable');
        }
        return response.data;
      })
    );
  }
}
