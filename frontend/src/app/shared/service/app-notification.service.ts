import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  fetchUnreadNotificationCount,
  fetchUnreadNotificationCountForToast,
  listNotificationGroups,
  markAllNotificationsRead,
  markNotificationRead
} from './notification-api.helper';

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

@Injectable({ providedIn: 'root' })
export class AppNotificationService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/app-notifications`;

  constructor(private http: HttpClient) {}

  listGrouped(): Observable<AppNotificationGroup[]> {
    return listNotificationGroups<AppNotificationGroup>(this.http, this.apiUrl);
  }

  unreadCount(): Observable<number> {
    return fetchUnreadNotificationCount(this.http, this.apiUrl);
  }

  /** Login toast: excludes TONTINE_CATCHUP (rattrapages). */
  unreadCountForToast(): Observable<number> {
    return fetchUnreadNotificationCountForToast(this.http, this.apiUrl);
  }

  markRead(id: number): Observable<boolean> {
    return markNotificationRead(this.http, this.apiUrl, id);
  }

  markAllRead(): Observable<boolean> {
    return markAllNotificationsRead(this.http, this.apiUrl);
  }
}
