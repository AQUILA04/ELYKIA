import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface TontineCollectionResetFileDto {
  id: number;
  fileName: string;
  commercialUsername?: string;
  quarter?: string;
  createdDate?: string;
}

export interface TontineCollectionResetRunNode {
  runId: number;
  status: string;
  triggeredBy: string;
  createdDate?: string;
  collectionsCount: number;
  collectionsAmount: number;
  membersResetCount?: number;
  scope?: 'SESSION' | 'COMMERCIAL';
  targetCommercialUsername?: string;
  files: TontineCollectionResetFileDto[];
}

export interface TontineCollectionResetYearNode {
  year: number;
  runs: TontineCollectionResetRunNode[];
}

export interface TontineCollectionResetRunResult {
  id: number;
  sessionId: number;
  sessionYear: number;
  status: string;
  triggeredBy: string;
  collectionsCount: number;
  collectionsAmount: number;
  membersResetCount: number;
  pdfFileCount: number;
  errorMessage?: string;
  createdDate?: string;
  scope?: 'SESSION' | 'COMMERCIAL';
  targetCommercialUsername?: string;
}

export interface TontineCommercialVoidPreview {
  sessionId: number;
  sessionYear: number;
  commercialUsername: string;
  collectionsCount: number;
  collectionsAmount: number;
  membersAffected: number;
  membersWithOtherCollections: number;
  preservedAmount: number;
  deliveryCollectionsCount: number;
  reportDays: number;
}

export interface TontineResetLine {
  id: number;
  clientName?: string;
  clientCode?: string;
  quarter?: string;
  amount: number;
  collectionDate?: string;
  reference?: string;
  deliveryCollection?: boolean;
  societyShareAmount?: number;
}

export interface TontineResetMember {
  id: number;
  clientName?: string;
  clientCode?: string;
  removedAmount: number;
  keptAmount: number;
  totalContributionBefore: number;
  totalContributionAfter: number;
  societyShareBefore: number;
  societyShareAfter: number;
  availableContributionBefore: number;
  availableContributionAfter: number;
}

export interface TontineResetReportDay {
  id: number;
  reportDate: string;
  collectionsAmountBefore: number;
  collectionsAmountAfter: number;
  amountToDepositBefore: number;
  amountToDepositAfter: number;
  amountDeposited: number;
  tontineAmountDeposited: number;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  number: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TontineCollectionResetService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/tontine/collections/reset`;

  constructor(private readonly http: HttpClient) {}

  getArchiveTree(): Observable<TontineCollectionResetYearNode[]> {
    return this.http.get<TontineCollectionResetYearNode[]>(this.baseUrl);
  }

  download(fileId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${fileId}/download`, { responseType: 'blob' });
  }

  triggerReset(): Observable<TontineCollectionResetRunResult> {
    return this.http.post<TontineCollectionResetRunResult>(this.baseUrl, {});
  }

  triggerExportOnly(): Observable<TontineCollectionResetRunResult> {
    return this.http.post<TontineCollectionResetRunResult>(`${this.baseUrl}/export`, {});
  }

  previewCommercial(commercialUsername: string, sessionYear: number): Observable<TontineCommercialVoidPreview> {
    const params = new HttpParams()
      .set('commercialUsername', commercialUsername)
      .set('sessionYear', String(sessionYear));
    return this.http.get<TontineCommercialVoidPreview>(`${this.baseUrl}/commercial/preview`, { params });
  }

  voidCommercial(commercialUsername: string, sessionYear: number): Observable<TontineCollectionResetRunResult> {
    return this.http.post<TontineCollectionResetRunResult>(`${this.baseUrl}/commercial`, {
      commercialUsername,
      sessionYear
    });
  }

  getLines(runId: number, page: number, size: number): Observable<SpringPage<TontineResetLine>> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<SpringPage<TontineResetLine>>(`${this.baseUrl}/runs/${runId}/lines`, { params });
  }

  getMembers(runId: number, page: number, size: number): Observable<SpringPage<TontineResetMember>> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<SpringPage<TontineResetMember>>(`${this.baseUrl}/runs/${runId}/members`, { params });
  }

  getReportDays(runId: number): Observable<TontineResetReportDay[]> {
    return this.http.get<TontineResetReportDay[]>(`${this.baseUrl}/runs/${runId}/report-days`);
  }

  downloadLinesCsv(runId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/runs/${runId}/lines.csv`, { responseType: 'blob' });
  }
}
