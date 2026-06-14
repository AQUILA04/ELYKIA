import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
