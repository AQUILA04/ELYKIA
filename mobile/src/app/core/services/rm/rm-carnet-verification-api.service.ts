import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  patchCarnetVerification,
  postCarnetVerificationsBulk,
  RmCarnetVerificationResult
} from './rm-carnet-verification-http.util';

export type RmCarnetVerificationMember = RmCarnetVerificationResult;

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/tontines/members`;

  constructor(private readonly http: HttpClient) {}

  setVerified(memberId: number, verified: boolean): Promise<RmCarnetVerificationMember> {
    return patchCarnetVerification(this.http, this.baseUrl, memberId, verified);
  }

  bulkSet(memberIds: number[], verified: boolean) {
    return postCarnetVerificationsBulk(this.http, this.baseUrl, 'memberIds', memberIds, verified);
  }
}
