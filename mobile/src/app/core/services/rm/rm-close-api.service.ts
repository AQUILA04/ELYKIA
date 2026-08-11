import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { CloseCreditsApiItem, CloseCreditsApiResponse } from './rm-close.models';

@Injectable({ providedIn: 'root' })
export class RmCloseApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/recovery-manager`;

  constructor(private readonly http: HttpClient) {}

  async closeCredits(items: CloseCreditsApiItem[]): Promise<CloseCreditsApiResponse> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<CloseCreditsApiResponse>>(`${this.baseUrl}/close-credits`, { items })
    );
    return res.data ?? { successes: [], failures: [] };
  }
}
