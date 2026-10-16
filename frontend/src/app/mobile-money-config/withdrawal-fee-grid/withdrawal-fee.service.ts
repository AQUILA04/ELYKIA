import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface WithdrawalFeeBracket {
  id?: number;
  network: string;
  minAmount: number;
  maxAmount: number;
  feeAmount: number;
}

interface ApiResponse {
  data?: WithdrawalFeeBracket[];
}

@Injectable({ providedIn: 'root' })
export class WithdrawalFeeService {
  private readonly url = `${environment.apiUrl}/api/v1/mobile-money-withdrawal-fees`;

  constructor(private http: HttpClient) {}

  list(): Observable<WithdrawalFeeBracket[]> {
    return this.http.get<ApiResponse>(this.url).pipe(map((body) => body?.data ?? []));
  }

  create(bracket: WithdrawalFeeBracket): Observable<unknown> {
    return this.http.post(this.url, bracket);
  }

  update(id: number, bracket: WithdrawalFeeBracket): Observable<unknown> {
    return this.http.put(`${this.url}/${id}`, bracket);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }
}
