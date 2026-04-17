import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ParameterRepository } from '../repositories/parameter.repository';
import { Parameter } from '../../models/parameter.model';

@Injectable({
  providedIn: 'root'
})
export class ParameterService {
  private apiUrl = `${environment.apiUrl}/api/parameters`;

  constructor(
    private http: HttpClient,
    private parameterRepo: ParameterRepository
  ) {}

  /**
   * Fetches parameters from the backend and saves them to the local database.
   */
  initializeParameters(): Observable<boolean> {
    return this.http.get<Parameter[]>(this.apiUrl).pipe(
      tap(async (parameters) => {
        if (parameters && parameters.length > 0) {
          await this.parameterRepo.saveAll(parameters);
        }
      }),
      map(() => true),
      catchError((error) => {
        console.error('Error initializing parameters:', error);
        return of(false);
      })
    );
  }

  /**
   * Gets a parameter value from the local database.
   */
  async getParameterValue(key: string): Promise<string | null> {
    return this.parameterRepo.getByKey(key);
  }

  /**
   * Checks if a boolean parameter is enabled (true).
   */
  async isEnabled(key: string): Promise<boolean> {
    const value = await this.getParameterValue(key);
    return value === 'true';
  }
}
