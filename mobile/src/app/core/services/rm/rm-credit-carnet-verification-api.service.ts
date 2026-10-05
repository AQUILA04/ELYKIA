import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';

export interface RmCreditCarnetVerificationResult {
  id: number;
  carnetVerified?: boolean;
  carnetVerifiedAt?: string;
  carnetVerifiedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/credits`;

  constructor(private readonly http: HttpClient) {}

  async setVerified(creditId: number, verified: boolean): Promise<RmCreditCarnetVerificationResult> {
    const res = await firstValueFrom(
      this.http.patch<ApiResponse<RmCreditCarnetVerificationResult>>(
        `${this.baseUrl}/${creditId}/carnet-verification`,
        { verified }
      )
    );
    return res.data;
  }

  async bulkSet(creditIds: number[], verified: boolean): Promise<{ updated: number; skipped: number; requested: number }> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<{ updated: number; skipped: number; requested: number }>>(
        `${this.baseUrl}/carnet-verifications`,
        { creditIds, verified }
      )
    );
    return res.data;
  }
}
