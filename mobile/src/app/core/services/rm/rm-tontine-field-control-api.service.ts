import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { RmTontineFieldControlDto } from './rm-tontine-field-control.models';

@Injectable({ providedIn: 'root' })
export class RmTontineFieldControlApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/tontines/members`;

  constructor(private readonly http: HttpClient) {}

  async create(memberId: number, payload: {
    reference: string;
    months: { year: number; month: number; commercialUsername: string; notebookAmount: number }[];
    note?: string;
    observedAt?: string;
  }): Promise<RmTontineFieldControlDto> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<RmTontineFieldControlDto>>(
        `${this.baseUrl}/${memberId}/field-controls`,
        payload
      )
    );
    return res.data;
  }

  async getLatest(memberId: number): Promise<RmTontineFieldControlDto> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<RmTontineFieldControlDto>>(
        `${this.baseUrl}/${memberId}/field-controls/latest`
      )
    );
    return res.data;
  }
}
