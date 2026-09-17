import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export type CustomerSubmissionStatus = 'INITIE' | 'VALIDE' | 'REJETE';

export interface CustomerMobileMoneySubmission {
  id: number;
  clientId: number;
  clientName?: string;
  creditId: number;
  installmentNumber: number;
  expectedAmount: number;
  mobileMoneyPhone: string;
  mobileMoneyAmount: number;
  mobileMoneyReference: string;
  notes?: string;
  status: CustomerSubmissionStatus;
  targetCollector?: string;
  tontineCollector?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  data: T;
}

interface PageResponse<T> {
  content: T[];
  totalElements?: number;
  page?: { totalElements?: number; totalPages?: number };
}

@Injectable({ providedIn: 'root' })
export class CustomerMobileMoneySubmissionService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/customer-mobile-money-submissions`;

  constructor(private http: HttpClient) {}

  list(status: CustomerSubmissionStatus = 'INITIE', page = 0, size = 50): Observable<CustomerMobileMoneySubmission[]> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', String(page))
      .set('size', String(size));
    return this.http
      .get<ApiResponse<PageResponse<CustomerMobileMoneySubmission> | CustomerMobileMoneySubmission[]>>(this.apiUrl, { params })
      .pipe(map((res) => {
        const data = res?.data as any;
        if (Array.isArray(data)) {
          return data;
        }
        return data?.content ?? [];
      }));
  }

  validate(id: number): Observable<CustomerMobileMoneySubmission> {
    return this.http
      .post<ApiResponse<CustomerMobileMoneySubmission>>(`${this.apiUrl}/${id}/validate`, {})
      .pipe(map((res) => res.data));
  }

  reject(id: number): Observable<CustomerMobileMoneySubmission> {
    return this.http
      .post<ApiResponse<CustomerMobileMoneySubmission>>(`${this.apiUrl}/${id}/reject`, {})
      .pipe(map((res) => res.data));
  }
}
