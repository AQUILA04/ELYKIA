import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export type AppNotificationType =
  | 'PAYMENT_DECLARATION'
  | 'CUSTOMER_ORDER'
  | 'TONTINE_CATCHUP'
  | 'TONTINE_PAYMENT_DECLARATION';

export interface AppNotificationItem {
  id: number;
  type: AppNotificationType;
  entityId?: number;
  entityReference?: string;
  title: string;
  message?: string;
  clientId?: number;
  clientName?: string;
  targetCollector?: string;
  tontineCollector?: string;
  operationDate?: string;
  amount?: number;
  linkPath?: string;
  linkQuery?: string;
  read: boolean;
  resolved: boolean;
}

export interface AppNotificationGroup {
  operationDate: string;
  items: AppNotificationItem[];
}

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AppNotificationService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/app-notifications`;

  constructor(private http: HttpClient) {}

  listGrouped(): Observable<AppNotificationGroup[]> {
    return this.http
      .get<ApiResponse<AppNotificationGroup[]>>(this.apiUrl)
      .pipe(map((res) => res?.data ?? []));
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<ApiResponse<{ count: number }>>(`${this.apiUrl}/unread-count`)
      .pipe(map((res) => res?.data?.count ?? 0));
  }

  markRead(id: number): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean>>(`${this.apiUrl}/${id}/read`, {})
      .pipe(map((res) => !!res?.data));
  }

  markAllRead(): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean>>(`${this.apiUrl}/read-all`, {})
      .pipe(map((res) => !!res?.data));
  }
}
