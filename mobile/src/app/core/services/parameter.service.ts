import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ParameterRepository } from '../repositories/parameter.repository';
import { Parameter } from '../../models/parameter.model';
import { SocietyShareVersion } from './tontine-allocation.mapper';

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
    return this.http.get<any>(`${this.apiUrl}/all`).pipe(
      switchMap((response) => from(this.persistParameters(response))),
      catchError(() =>
        this.http.get<any>(`${this.apiUrl}?page=0&size=1000`).pipe(
          switchMap((response) => from(this.persistParameters(response)))
        )
      ),
      catchError((error) => {
        console.error('Error initializing parameters:', error);
        return of(false);
      })
    );
  }

  private async persistParameters(response: any): Promise<boolean> {
    const parameters = this.extractParameters(response);
    if (parameters.length > 0) {
      await this.parameterRepo.saveAll(parameters);
    }
    return true;
  }

  private extractParameters(response: any): Parameter[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.data?.content)) {
      return response.data.content;
    }
    if (Array.isArray(response?.content)) {
      return response.content;
    }
    return [];
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

  /**
   * Last locally stored society-share algorithm version. Defaults to V1.
   */
  async getSocietyShareVersion(): Promise<SocietyShareVersion> {
    const value = (await this.getParameterValue('TONTINE_SOCIETY_SHARE_VERSION') || 'V1').trim().toUpperCase();
    return value === 'V2' ? 'V2' : 'V1';
  }
}
