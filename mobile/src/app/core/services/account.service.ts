import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, concatMap } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { Account } from '../../models/account.model';
import { ApiResponse } from '../../models/api-response.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { HealthCheckService } from './health-check.service';
import { AccountRepository } from '../repositories/account.repository';
import {LoggerService} from "./logger.service";

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private commercialUsername: string | undefined;

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private accountRepository: AccountRepository,
    private store: Store,
    private healthCheckService: HealthCheckService,
    private readonly log: LoggerService
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  initializeAccounts(): Observable<Account[]> {
    if (!this.commercialUsername) {
      console.error('Account service: Commercial username not available for initialization.');
      return of([]);
    }
    const currentCommercialId = this.commercialUsername;

    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchAccountsFromApi().pipe(
            concatMap(async (accounts) => {
              await this.dbService.saveAccounts(accounts);
              return accounts;
            }),
            catchError((error) => {
              console.error('Failed to fetch accounts from API, falling back to local', error);
              return from(this.dbService.getAccounts(currentCommercialId)).pipe(
                map(localAccounts => {
                  if (localAccounts && localAccounts.length > 0) {
                    return localAccounts;
                  } else {
                    this.log.log('ERROR:' + 'AccountService: Failed to fetch accounts from API, falling back to local' + JSON.stringify(error, null, 2));
                    throw new Error('Impossible de charger les comptes. Veuillez vérifier votre connexion ou synchroniser.');
                  }
                })
              );
            })
          );
        } else {
          return from(this.dbService.getAccounts(currentCommercialId)).pipe(
            map(localAccounts => {
              if (localAccounts && localAccounts.length > 0) {
                return localAccounts;
              } else {
                throw new Error('Impossible de charger les comptes. Veuillez vérifier votre connexion ou synchroniser.');
              }
            })
          );
        }
      }),
      catchError(err => {
        console.error('Account initialization failed:', err);
        return of([]); // Return an empty array on final failure
      })
    );
  }

  private fetchAccountsFromApi(): Observable<Account[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    const url = `${environment.apiUrl}/api/v1/accounts/by-commercial?page=0&size=2000&sort=id,desc&commercial=${this.commercialUsername}`;
    return this.http.get<ApiResponse<{ content: Account[] }>>(url).pipe(
      map(response => response.data.content)
    );
  }

  async getAccounts(): Promise<Account[]> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    return await this.dbService.getAccounts(this.commercialUsername);
  }

  getAccountFromDB(): Observable<Account[]> {
    return from(this.getAccounts());
  }

  getAccountByClientId(clientId: string): Observable<Account | null> {
    return from(this.accountRepository.findByClientId(clientId));
  }

  getAccountsByClientIds(clientIds: string[]): Observable<Account[]> {
    return from(this.accountRepository.findByClientIds(clientIds));
  }
}
