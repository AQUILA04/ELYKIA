import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CarnetEcartBulkResult,
  CarnetEcartDomain,
  CarnetEcartItem,
  CarnetEcartQueue
} from '../models/carnet-ecart.model';

@Injectable({ providedIn: 'root' })
export class CarnetEcartService {
  private readonly apiUrl = `${environment.apiUrl}/api/v1/carnet-ecarts`;

  constructor(private http: HttpClient) {}

  list(queue: CarnetEcartQueue, domain?: CarnetEcartDomain | '', commercial?: string): Observable<CarnetEcartItem[]> {
    let params = new HttpParams().set('queue', queue);
    if (domain) {
      params = params.set('domain', domain);
    }
    if (commercial) {
      params = params.set('commercial', commercial);
    }
    return this.http.get<CarnetEcartItem[]>(this.apiUrl, { params });
  }

  accept(keys: string[]): Observable<CarnetEcartBulkResult> {
    return this.http.post<CarnetEcartBulkResult>(`${this.apiUrl}/accept`, { keys });
  }

  reject(keys: string[], note: string): Observable<CarnetEcartBulkResult> {
    return this.http.post<CarnetEcartBulkResult>(`${this.apiUrl}/reject`, { keys, note });
  }
}
