import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

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

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TontineCatchupNotificationService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/tontine-catchup-notifications`;

  constructor(private http: HttpClient) {}

  listGrouped(): Observable<TontineCatchupNotificationGroup[]> {
    return this.http
      .get<ApiResponse<TontineCatchupNotificationGroup[]>>(this.apiUrl)
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
