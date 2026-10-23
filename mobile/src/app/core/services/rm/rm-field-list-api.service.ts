import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { RmCreditLate, RmPackTontineMember } from './rm.models';

export interface RmServerPage<T> {
  content: T[];
  totalElements: number;
}

const PAGE_SIZE = 30;

@Injectable({ providedIn: 'root' })
export class RmFieldListApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/recovery-manager/field`;

  constructor(private readonly http: HttpClient) {}

  pageTontineMembers(search: string, page: number): Promise<RmServerPage<RmPackTontineMember>> {
    return this.page<RmPackTontineMember>('tontine-members', search, page);
  }

  pageLateCredits(search: string, page: number): Promise<RmServerPage<RmCreditLate>> {
    return this.page<RmCreditLate>('late-credits', search, page);
  }

  pageCredits(search: string, page: number): Promise<RmServerPage<RmCreditLate>> {
    return this.page<RmCreditLate>('credits', search, page);
  }

  async getTontineMember(id: number): Promise<RmPackTontineMember> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<RmPackTontineMember>>(`${this.baseUrl}/tontine-members/${id}`)
    );
    return res.data;
  }

  private async page<T>(path: string, search: string, page: number): Promise<RmServerPage<T>> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<any>>(`${this.baseUrl}/${path}`, {
        params: {
          search: search || '',
          page: String(page),
          size: String(PAGE_SIZE)
        }
      })
    );
    const data = res.data ?? {};
    const content = (data.content ?? []) as T[];
    const totalElements = Number(data.totalElements ?? data.page?.totalElements ?? content.length);
    return { content, totalElements };
  }
}
