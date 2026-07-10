import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  CommercialMobileMoneyConfigPage,
  CommercialMobileMoneyConfigRow,
  CommercialMobileMoneyConfigUpsert,
} from './mobile-money-config.model';

@Injectable({ providedIn: 'root' })
export class MobileMoneyConfigService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/commercial-mobile-money-config`;

  constructor(private http: HttpClient) {}

  listAll(): Observable<CommercialMobileMoneyConfigPage> {
    return this.http.get<{ data: CommercialMobileMoneyConfigPage }>(this.baseUrl).pipe(
      map((response) => response.data),
    );
  }

  upsert(username: string, payload: CommercialMobileMoneyConfigUpsert): Observable<CommercialMobileMoneyConfigRow> {
    return this.http.put<{ data: CommercialMobileMoneyConfigRow }>(
      `${this.baseUrl}/${encodeURIComponent(username)}`,
      payload,
    ).pipe(map((response) => response.data));
  }
}
