import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { RmFieldControlDto } from './rm-field-control.models';

@Injectable({ providedIn: 'root' })
export class RmFieldControlApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/credits`;

  constructor(private readonly http: HttpClient) {}

  async create(creditId: number, payload: {
    reference: string;
    notebookTotalAmount: number;
    note?: string;
    observedAt?: string;
  }): Promise<RmFieldControlDto> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<RmFieldControlDto>>(
        `${this.baseUrl}/${creditId}/field-controls`,
        payload
      )
    );
    return res.data;
  }
}
