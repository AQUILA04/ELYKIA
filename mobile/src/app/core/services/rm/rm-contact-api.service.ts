import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { RmPackClient } from './rm.models';

export interface RmContactApiPayload {
  phone?: string;
  latitude?: number;
  longitude?: number;
  mll?: string;
  reference?: string;
}

@Injectable({ providedIn: 'root' })
export class RmContactApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/recovery-manager`;

  constructor(private readonly http: HttpClient) {}

  async updateContact(clientId: number, payload: RmContactApiPayload): Promise<RmPackClient> {
    const res = await firstValueFrom(
      this.http.patch<ApiResponse<RmPackClient>>(`${this.baseUrl}/clients/${clientId}/contact`, payload)
    );
    return res.data;
  }
}
