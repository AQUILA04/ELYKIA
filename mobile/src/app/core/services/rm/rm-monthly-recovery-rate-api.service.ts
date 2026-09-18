import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { MonthlyRecoveryRate } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmMonthlyRecoveryRateApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/recovery-manager`;

  constructor(private readonly http: HttpClient) {}

  async getMonthlyRecoveryRate(year?: number, month?: number): Promise<MonthlyRecoveryRate> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', String(year));
    }
    if (month != null) {
      params = params.set('month', String(month));
    }
    const res = await firstValueFrom(
      this.http.get<ApiResponse<MonthlyRecoveryRate>>(
        `${this.baseUrl}/kpi/monthly-recovery-rate`,
        { params }
      )
    );
    return res.data;
  }
}
