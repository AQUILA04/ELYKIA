import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Page } from 'src/app/shared/models/page.model';

export interface CustomerActivityLog {
  id: number;
  eventId: string;
  occurredAt: string;
  receivedAt?: string;
  source?: string;
  category?: string;
  eventType?: string;
  clientId?: number | null;
  phone?: string | null;
  deviceId?: string | null;
  sessionId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  screen?: string | null;
  httpStatus?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CustomerActivityLogSummary {
  from?: string;
  to?: string;
  totalEvents: number;
  errorCount: number;
  authFailureCount: number;
  loginSuccessCount: number;
  uniqueClients: number;
  uniqueDevices: number;
  uniqueSessions: number;
  byCategory?: Record<string, number>;
  bySource?: Record<string, number>;
  byPlatform?: Record<string, number>;
  topEventTypes?: { name: string; count: number }[];
  topHttpPaths?: { name: string; count: number }[];
  byAppVersion?: { appVersion: string; count: number; errorCount: number }[];
}

export interface CustomerActivityLogFilters {
  clientId?: number | null;
  phone?: string;
  deviceId?: string;
  sessionId?: string;
  from?: string;
  to?: string;
  category?: string;
  source?: string;
  platform?: string;
  appVersion?: string;
  httpStatus?: number | null;
  q?: string;
  outcome?: string;
  eventType?: string[];
}

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class CustomerActivityAuditService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/customer-activity-logs`;

  constructor(private http: HttpClient) {}

  search(
    filters: CustomerActivityLogFilters,
    page = 0,
    size = 50
  ): Observable<Page<CustomerActivityLog>> {
    const params = this.buildParams(filters)
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'occurredAt,desc');
    return this.http
      .get<ApiResponse<Page<CustomerActivityLog>>>(this.apiUrl, { params })
      .pipe(map((res) => res?.data ?? emptyPage()));
  }

  summary(filters: CustomerActivityLogFilters): Observable<CustomerActivityLogSummary> {
    return this.http
      .get<ApiResponse<CustomerActivityLogSummary>>(`${this.apiUrl}/summary`, {
        params: this.buildParams(filters),
      })
      .pipe(
        map(
          (res) =>
            res?.data ?? {
              totalEvents: 0,
              errorCount: 0,
              authFailureCount: 0,
              loginSuccessCount: 0,
              uniqueClients: 0,
              uniqueDevices: 0,
              uniqueSessions: 0,
            }
        )
      );
  }

  sessionTimeline(
    sessionId: string,
    from?: string,
    to?: string
  ): Observable<CustomerActivityLog[]> {
    let params = new HttpParams().set('limit', '500');
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http
      .get<ApiResponse<CustomerActivityLog[]>>(`${this.apiUrl}/sessions/${encodeURIComponent(sessionId)}`, {
        params,
      })
      .pipe(map((res) => res?.data ?? []));
  }

  private buildParams(filters: CustomerActivityLogFilters): HttpParams {
    let params = new HttpParams();
    const setIf = (key: string, value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      params = params.set(key, String(value));
    };
    setIf('clientId', filters.clientId ?? undefined);
    setIf('phone', filters.phone);
    setIf('deviceId', filters.deviceId);
    setIf('sessionId', filters.sessionId);
    setIf('from', filters.from);
    setIf('to', filters.to);
    setIf('category', filters.category);
    setIf('source', filters.source);
    setIf('platform', filters.platform);
    setIf('appVersion', filters.appVersion);
    setIf('httpStatus', filters.httpStatus ?? undefined);
    setIf('q', filters.q);
    setIf('outcome', filters.outcome);
    (filters.eventType ?? []).forEach((et) => {
      if (et) {
        params = params.append('eventType', et);
      }
    });
    return params;
  }
}

function emptyPage<T>(): Page<T> {
  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    last: true,
    size: 50,
    number: 0,
    sort: null,
    numberOfElements: 0,
    first: true,
    empty: true,
  };
}
