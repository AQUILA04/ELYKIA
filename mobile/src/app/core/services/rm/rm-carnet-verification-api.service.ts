import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';

export interface RmCarnetVerificationMember {
  id: number;
  carnetVerified?: boolean;
  carnetVerifiedAt?: string;
  carnetVerifiedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/tontines/members`;

  constructor(private readonly http: HttpClient) {}

  async setVerified(memberId: number, verified: boolean): Promise<RmCarnetVerificationMember> {
    const res = await firstValueFrom(
      this.http.patch<ApiResponse<RmCarnetVerificationMember>>(
        `${this.baseUrl}/${memberId}/carnet-verification`,
        { verified }
      )
    );
    return res.data;
  }

  async bulkSet(memberIds: number[], verified: boolean): Promise<{ updated: number; skipped: number; requested: number }> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<{ updated: number; skipped: number; requested: number }>>(
        `${this.baseUrl}/carnet-verifications`,
        { memberIds, verified }
      )
    );
    return res.data;
  }
}
