import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DefaultDailyStakeDto } from '../default-daily-stake-dto';
import { SpecialDailyStakeDto } from '../default-daily-stake-dto';
import { TicketingDto } from '../default-daily-stake-dto';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';


@Injectable({
  providedIn: 'root'
})
export class CashDeskService {

  private apiUrl = `${environment.apiUrl}/api/v1/cash-desks`;
  private baseUrl = `${environment.apiUrl}/api/v1/credits`;
  private dailyStakeUrl = `${environment.apiUrl}/api/v1/credits`;


  constructor(private http: HttpClient,
    private tokenStorage : TokenStorageService
  ) {}

  getHeader(){
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return headers;
  }

  checkOpenCashDesk(): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}/is-opened`,{headers});
  }

  openCashDesk(): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}/open`,{headers});
  }
  closeCashDesk(): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}/close`, {headers});
  }

// submitFinalData(finalData: { normalStake: any[]; specialStake: any[]; ticketingData: any }): Observable<any> {
//   return this.http.get(`${this.apiUrl}/close`, finalData);
// }


  downloadDailyOperation(username: string | null): Observable<any> {
    const headers= this.getHeader();
    return this.http.get(`${this.apiUrl}/print-daily-operation/pdf/${username}`, { responseType: 'blob', headers },);
  }

  // getAllCreditsByCollector(): Observable<any[]> {
  //   return this.http.get<any>(`${this.baseUrl}/by-collector/all`).pipe(
  //     map(response => response.data)
  //   );
  // }
  getAllCreditsByCollector(): Observable<any[]> {
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get<any>(`${this.baseUrl}/by-collector/all`, { headers })
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error fetching credits:', error);
          return throwError(() => new Error('Error fetching credits.'));
        })
      );
  }

  getAllCreditsByCollectorV2(): Observable<{ [key: string]: any[] }> {
    const token = this.tokenStorage.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get<any>(`${this.baseUrl}/by-collector/all-grouped`, { headers })
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error fetching credits:', error);
          return throwError(() => new Error('Error fetching credits.'));
        })
      );
  }



  submitOperations(dto: DefaultDailyStakeDto): Observable<any> {
    const headers= this.getHeader();
    return this.http.post<any>(`${this.dailyStakeUrl}/default-daily-stake`, dto, { headers });
  }

  submitSpecialDailyStake(dto: SpecialDailyStakeDto): Observable<any> {
    const headers= this.getHeader();
    return this.http.post<any>(`${this.dailyStakeUrl}/special-daily-stake`, dto, { headers });
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }
  submitTicketing(dto: TicketingDto): Observable<any> {
    const headers= this.getHeader();
    return this.http.patch<any>(`${this.apiUrl}/ticketing`, dto, {headers});
  }
}
