import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export type CustomerSubmissionStatus = 'INITIE' | 'VALIDE' | 'REJETE';

export interface CustomerTontineMmSubmission {
  id: number;
  clientId: number;
  clientName?: string;
  tontineMemberId: number;
  expectedAmount: number;
  mobileMoneyPhone: string;
  mobileMoneyAmount: number;
  mobileMoneyReference: string;
  notes?: string;
  operationDate?: string;
  status: CustomerSubmissionStatus;
  tontineCollector?: string;
  tontineCollectionId?: number;
  createdAt?: string;
}

interface ApiResponse<T> {
  data: T;
}

interface PageResponse<T> {
  content: T[];
}

@Injectable({ providedIn: 'root' })
export class CustomerTontineMmSubmissionService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/customer-tontine-mm-submissions`;

  constructor(private http: HttpClient) {}

  list(status: CustomerSubmissionStatus = 'INITIE', page = 0, size = 50): Observable<CustomerTontineMmSubmission[]> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', String(page))
      .set('size', String(size));
    return this.http
      .get<ApiResponse<PageResponse<CustomerTontineMmSubmission> | CustomerTontineMmSubmission[]>>(this.apiUrl, { params })
      .pipe(map((res) => {
        const data = res?.data as any;
        if (Array.isArray(data)) {
          return data;
        }
        return data?.content ?? [];
      }));
  }

  validate(id: number): Observable<CustomerTontineMmSubmission> {
    return this.http
      .post<ApiResponse<CustomerTontineMmSubmission>>(`${this.apiUrl}/${id}/validate`, {})
      .pipe(map((res) => res.data));
  }

  reject(id: number): Observable<CustomerTontineMmSubmission> {
    return this.http
      .post<ApiResponse<CustomerTontineMmSubmission>>(`${this.apiUrl}/${id}/reject`, {})
      .pipe(map((res) => res.data));
  }
}
