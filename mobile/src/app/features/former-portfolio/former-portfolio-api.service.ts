import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { FormerPortfolioSyncPayload } from './former-portfolio.models';

@Injectable({ providedIn: 'root' })
export class FormerPortfolioApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/former-portfolio`;

  constructor(private readonly http: HttpClient) {}

  async sync(): Promise<FormerPortfolioSyncPayload> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<FormerPortfolioSyncPayload>>(`${this.baseUrl}/sync`)
    );
    return response.data;
  }
}
