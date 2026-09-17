import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CustomerSubmissionStatus,
  listSubmissionPage,
  postSubmissionAction
} from './submission-api.helper';

export type { CustomerSubmissionStatus };

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

@Injectable({ providedIn: 'root' })
export class CustomerMobileMoneySubmissionService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/customer-mobile-money-submissions`;

  constructor(private http: HttpClient) {}

  list(status: CustomerSubmissionStatus = 'INITIE', page = 0, size = 50): Observable<CustomerMobileMoneySubmission[]> {
    return listSubmissionPage<CustomerMobileMoneySubmission>(this.http, this.apiUrl, status, page, size);
  }

  validate(id: number): Observable<CustomerMobileMoneySubmission> {
    return postSubmissionAction<CustomerMobileMoneySubmission>(this.http, this.apiUrl, id, 'validate');
  }

  reject(id: number): Observable<CustomerMobileMoneySubmission> {
    return postSubmissionAction<CustomerMobileMoneySubmission>(this.http, this.apiUrl, id, 'reject');
  }
}
