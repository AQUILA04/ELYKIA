import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CustomerSubmissionStatus,
  listSubmissionPage,
  postSubmissionAction
} from './submission-api.helper';

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

@Injectable({ providedIn: 'root' })
export class CustomerTontineMmSubmissionService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/customer-tontine-mm-submissions`;

  constructor(private http: HttpClient) {}

  list(status: CustomerSubmissionStatus = 'INITIE', page = 0, size = 50): Observable<CustomerTontineMmSubmission[]> {
    return listSubmissionPage<CustomerTontineMmSubmission>(this.http, this.apiUrl, status, page, size);
  }

  validate(id: number): Observable<CustomerTontineMmSubmission> {
    return postSubmissionAction<CustomerTontineMmSubmission>(this.http, this.apiUrl, id, 'validate');
  }

  reject(id: number): Observable<CustomerTontineMmSubmission> {
    return postSubmissionAction<CustomerTontineMmSubmission>(this.http, this.apiUrl, id, 'reject');
  }
}
