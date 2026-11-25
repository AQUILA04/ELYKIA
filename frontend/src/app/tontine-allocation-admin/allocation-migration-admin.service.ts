import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

export type MigrationRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface MigrationRun {
  id: number;
  running: boolean;
  fromVersion: string | null;
  toVersion: string | null;
  processedMembers: number;
  totalMembers: number;
  failedMembers: number;
  startedAt: string | null;
  finishedAt: string | null;
  status: MigrationRunStatus;
  triggeredBy: string | null;
  errorMessage: string | null;
}

export interface MigrationFailure {
  id: number;
  runId: number;
  memberId: number;
  memberName: string | null;
  errorType: string | null;
  message: string | null;
  detail: string | null;
  occurredAt: string;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class AllocationMigrationAdminService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/tontines`;

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.tokenStorage.getToken()}` });
  }

  listRuns(page: number, size: number): Observable<PageResult<MigrationRun>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<{ data: PageResult<MigrationRun> }>(`${this.apiUrl}/allocation-migration/runs`, { headers: this.headers(), params })
      .pipe(map(r => r.data));
  }

  getRun(runId: number): Observable<MigrationRun> {
    return this.http
      .get<{ data: MigrationRun }>(`${this.apiUrl}/allocation-migration/runs/${runId}`, { headers: this.headers() })
      .pipe(map(r => r.data));
  }

  listFailures(runId: number, page: number, size: number): Observable<PageResult<MigrationFailure>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<{ data: PageResult<MigrationFailure> }>(
        `${this.apiUrl}/allocation-migration/runs/${runId}/failures`, { headers: this.headers(), params })
      .pipe(map(r => r.data));
  }

  retry(runId: number): Observable<MigrationRun> {
    return this.http
      .post<{ data: MigrationRun }>(`${this.apiUrl}/allocation-migration/runs/${runId}/retry`, {}, { headers: this.headers() })
      .pipe(map(r => r.data));
  }

  startFullRecalculation(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/sessions/current/recalculate-allocations`, {}, { headers: this.headers() });
  }
}
