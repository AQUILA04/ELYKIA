import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export type CustomerSubmissionStatus = 'INITIE' | 'VALIDE' | 'REJETE';

interface ApiResponse<T> {
  data: T;
}

interface PageResponse<T> {
  content: T[];
}

export function listSubmissionPage<T>(
  http: HttpClient,
  apiUrl: string,
  status: CustomerSubmissionStatus = 'INITIE',
  page = 0,
  size = 50
): Observable<T[]> {
  const params = new HttpParams()
    .set('status', status)
    .set('page', String(page))
    .set('size', String(size));
  return http
    .get<ApiResponse<PageResponse<T> | T[]>>(apiUrl, { params })
    .pipe(map((res) => {
      const data = res?.data as PageResponse<T> | T[] | undefined;
      if (Array.isArray(data)) {
        return data;
      }
      return data?.content ?? [];
    }));
}

export function postSubmissionAction<T>(
  http: HttpClient,
  apiUrl: string,
  id: number,
  action: 'validate' | 'reject'
): Observable<T> {
  return http
    .post<ApiResponse<T>>(`${apiUrl}/${id}/${action}`, {})
    .pipe(map((res) => res.data));
}
