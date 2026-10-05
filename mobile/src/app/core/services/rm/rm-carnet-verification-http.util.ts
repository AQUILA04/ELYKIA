import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../../../models/api-response.model';

export interface RmCarnetVerificationResult {
  id: number;
  carnetVerified?: boolean;
  carnetVerifiedAt?: string;
  carnetVerifiedBy?: string;
}

export type RmCarnetBulkIdsField = 'memberIds' | 'creditIds';

export async function patchCarnetVerification<T extends RmCarnetVerificationResult>(
  http: HttpClient,
  baseUrl: string,
  entityId: number,
  verified: boolean
): Promise<T> {
  const res = await firstValueFrom(
    http.patch<ApiResponse<T>>(`${baseUrl}/${entityId}/carnet-verification`, { verified })
  );
  return res.data;
}

export async function postCarnetVerificationsBulk(
  http: HttpClient,
  baseUrl: string,
  idsField: RmCarnetBulkIdsField,
  ids: number[],
  verified: boolean
): Promise<{ updated: number; skipped: number; requested: number }> {
  const res = await firstValueFrom(
    http.post<ApiResponse<{ updated: number; skipped: number; requested: number }>>(
      `${baseUrl}/carnet-verifications`,
      { [idsField]: ids, verified }
    )
  );
  return res.data;
}
