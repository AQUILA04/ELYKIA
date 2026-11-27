import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { RmSocietyShareResult } from './rm-society-share.models';

@Injectable({ providedIn: 'root' })
export class RmSocietyShareApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/tontines/members`;

  constructor(private readonly http: HttpClient) {}

  /** Egal à la part en place : validée sans mise à jour. Différent : la part et le solde sont refaits tout de suite. */
  async submit(
    memberId: number,
    declaredSocietyShare: number,
    reference: string,
    comment?: string | null
  ): Promise<RmSocietyShareResult> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<RmSocietyShareResult>>(
        `${this.baseUrl}/${memberId}/society-share-adjustments`,
        { reference, declaredSocietyShare, comment: comment || null, source: 'RM_CONTROL' }
      )
    );
    if (!response?.data) {
      throw new Error(response?.message || 'Réponse invalide du serveur pour la part société');
    }
    return response.data;
  }
}
