import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  fetchUnreadNotificationCount,
  listNotificationGroups,
  markAllNotificationsRead,
  markNotificationRead
} from '../../shared/service/notification-api.helper';

export interface TontineCatchupNotificationItem {
  id: number;
  commercialUsername: string;
  operationDate: string;
  captureDate: string;
  amount: number;
  clientName?: string;
  collectionReference?: string;
  read: boolean;
}

export interface TontineCatchupNotificationGroup {
  operationDate: string;
  items: TontineCatchupNotificationItem[];
}

@Injectable({ providedIn: 'root' })
export class TontineCatchupNotificationService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/tontine-catchup-notifications`;

  constructor(private http: HttpClient) {}

  listGrouped(): Observable<TontineCatchupNotificationGroup[]> {
    return listNotificationGroups<TontineCatchupNotificationGroup>(this.http, this.apiUrl);
  }

  unreadCount(): Observable<number> {
    return fetchUnreadNotificationCount(this.http, this.apiUrl);
  }

  markRead(id: number): Observable<boolean> {
    return markNotificationRead(this.http, this.apiUrl, id);
  }

  markAllRead(): Observable<boolean> {
    return markAllNotificationsRead(this.http, this.apiUrl);
  }
}
