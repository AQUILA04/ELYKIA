import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UserAuthorizedDevice {
  id: number;
  deviceLabel?: string;
  platform?: string;
  model?: string;
  appVersion?: string;
  registeredAt?: string;
  lastSeenAt?: string;
  active: boolean;
  registeredBy?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserDeviceService {
  private baseUrl = `${environment.apiUrl}/api/v1/users`;

  constructor(private http: HttpClient) {}

  listDevices(userId: number): Observable<{ data: UserAuthorizedDevice[] }> {
    return this.http.get<{ data: UserAuthorizedDevice[] }>(`${this.baseUrl}/${userId}/devices`);
  }

  revokeDevice(userId: number, deviceRecordId: number): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/${userId}/devices/${deviceRecordId}/revoke`, {});
  }

  restoreDevice(userId: number, deviceRecordId: number): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/${userId}/devices/${deviceRecordId}/restore`, {});
  }

  deleteDevice(userId: number, deviceRecordId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${userId}/devices/${deviceRecordId}`);
  }

  updateRestriction(userId: number, enabled: boolean): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/${userId}/devices/restriction`, { enabled });
  }
}
