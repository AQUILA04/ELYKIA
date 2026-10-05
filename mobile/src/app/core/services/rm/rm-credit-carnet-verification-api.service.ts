import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  patchCarnetVerification,
  postCarnetVerificationsBulk,
  RmCarnetVerificationResult
} from './rm-carnet-verification-http.util';

export type RmCreditCarnetVerificationResult = RmCarnetVerificationResult;

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/credits`;

  constructor(private readonly http: HttpClient) {}

  setVerified(creditId: number, verified: boolean): Promise<RmCreditCarnetVerificationResult> {
    return patchCarnetVerification(this.http, this.baseUrl, creditId, verified);
  }

  bulkSet(creditIds: number[], verified: boolean) {
    return postCarnetVerificationsBulk(this.http, this.baseUrl, 'creditIds', creditIds, verified);
  }
}
