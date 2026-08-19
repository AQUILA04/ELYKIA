import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { RmCollectorOption } from './rm-collector-assign.models';

export interface BulkAssignCollectorsPayload {
  clientIds: number[];
  collector?: string;
  tontineCollector?: string;
  transferInProgressCredits?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RmCollectorAssignApiService {
  private readonly clientsUrl = `${environment.apiUrl}/api/v1/clients`;
  private readonly promotersUrl = `${environment.apiUrl}/api/v1/promoters/all`;

  constructor(private readonly http: HttpClient) {}

  async bulkAssign(payload: BulkAssignCollectorsPayload): Promise<boolean> {
    const body: BulkAssignCollectorsPayload = {
      clientIds: payload.clientIds,
      transferInProgressCredits: !!payload.transferInProgressCredits && !!payload.collector
    };
    if (payload.collector) {
      body.collector = payload.collector;
    }
    if (payload.tontineCollector) {
      body.tontineCollector = payload.tontineCollector;
    }
    const res = await firstValueFrom(
      this.http.post<ApiResponse<boolean>>(`${this.clientsUrl}/bulk-assign-collectors`, body)
    );
    return res.data === true;
  }

  async listPromoters(): Promise<RmCollectorOption[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<unknown[]>>(this.promotersUrl)
    );
    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map(row => this.mapCollector(row)).filter(c => !!c.username);
  }

  private mapCollector(raw: unknown): RmCollectorOption {
    const row = (raw || {}) as Record<string, unknown>;
    const username = String(row['username'] || row['userName'] || '');
    const firstname = String(row['firstname'] || row['firstName'] || '');
    const lastname = String(row['lastname'] || row['lastName'] || '');
    const fullName = String(row['fullName'] || row['displayName'] || '');
    const displayName = [firstname, lastname].filter(Boolean).join(' ') || fullName || username;
    return { username, firstname, lastname, displayName };
  }
}
