import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Parameter } from './parameter.model';
import { environment } from 'src/environments/environment';

export const MOBILE_DEVICE_RESTRICTION_PARAMETER_KEY = 'ENABLED_MOBILE_DEVICE_RESTRICTION';
export const TONTINE_SOCIETY_SHARE_VERSION_KEY = 'TONTINE_SOCIETY_SHARE_VERSION';
export const TONTINE_SOCIETY_SHARE_VERSION_OPTIONS = ['V1', 'V2'] as const;

@Injectable({
  providedIn: 'root'
})
export class ParameterService {
  private apiUrl = `${environment.apiUrl}/api/parameters`;

  constructor(private http: HttpClient) { }

  getAll(page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  getByKey(key: string): Observable<Parameter> {
    return this.http.get<Parameter>(`${this.apiUrl}/key/${key}`);
  }

  create(parameter: Parameter): Observable<Parameter> {
    return this.http.post<Parameter>(this.apiUrl, parameter);
  }

  update(id: number, parameter: Parameter): Observable<Parameter> {
    return this.http.put<Parameter>(`${this.apiUrl}/${id}`, parameter);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
