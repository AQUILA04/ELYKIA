import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import {
  FieldDayPlan,
  FieldDayPlanRequest,
  RmCollectorStat,
  RmOfflinePack
} from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmFieldPlanApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/recovery-manager`;

  constructor(private readonly http: HttpClient) {}

  async getCollectorStats(): Promise<RmCollectorStat[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<RmCollectorStat[]>>(`${this.baseUrl}/field-plans/collector-stats`)
    );
    return res.data ?? [];
  }

  async getTodayPlan(): Promise<FieldDayPlan | null> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<FieldDayPlan | null>>(`${this.baseUrl}/field-plans/today`)
    );
    return res.data ?? null;
  }

  async createPlan(request: FieldDayPlanRequest): Promise<FieldDayPlan> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<FieldDayPlan>>(`${this.baseUrl}/field-plans`, request)
    );
    return res.data;
  }

  async updatePlan(id: number, request: FieldDayPlanRequest): Promise<FieldDayPlan> {
    const res = await firstValueFrom(
      this.http.patch<ApiResponse<FieldDayPlan>>(`${this.baseUrl}/field-plans/${id}`, request)
    );
    return res.data;
  }

  async downloadOfflinePack(planId: number, includeTontine = false): Promise<RmOfflinePack> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<RmOfflinePack>>(
        `${this.baseUrl}/field-plans/${planId}/offline-pack`,
        { params: { includeTontine: String(includeTontine) } }
      )
    );
    return res.data;
  }
}
