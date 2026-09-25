import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface ApiResponse<T> {
  data: T;
}

export function listNotificationGroups<T>(http: HttpClient, apiUrl: string): Observable<T[]> {
  return http
    .get<ApiResponse<T[]>>(apiUrl)
    .pipe(map((res) => res?.data ?? []));
}

export function fetchUnreadNotificationCount(http: HttpClient, apiUrl: string): Observable<number> {
  return http
    .get<ApiResponse<{ count: number }>>(`${apiUrl}/unread-count`)
    .pipe(map((res) => res?.data?.count ?? 0));
}

/** Unread count excluding TONTINE_CATCHUP — for login toast only. */
export function fetchUnreadNotificationCountForToast(http: HttpClient, apiUrl: string): Observable<number> {
  return http
    .get<ApiResponse<{ count: number }>>(`${apiUrl}/unread-count-for-toast`)
    .pipe(map((res) => res?.data?.count ?? 0));
}

export function markNotificationRead(http: HttpClient, apiUrl: string, id: number): Observable<boolean> {
  return http
    .post<ApiResponse<boolean>>(`${apiUrl}/${id}/read`, {})
    .pipe(map((res) => !!res?.data));
}

export function markAllNotificationsRead(http: HttpClient, apiUrl: string): Observable<boolean> {
  return http
    .post<ApiResponse<boolean>>(`${apiUrl}/read-all`, {})
    .pipe(map((res) => !!res?.data));
}
