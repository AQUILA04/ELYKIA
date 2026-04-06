import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { ApiResponse } from '../../models/api-response.model';
import { Locality } from '../../models/locality.model';
import { HealthCheckService } from './health-check.service';
import { LocalityRepository } from '../repositories/locality.repository';
import { LocalityRepositoryExtensions, LocalityRepositoryFilters } from '../repositories/locality.repository.extensions';
import { Page } from '../repositories/repository.interface';

@Injectable({
  providedIn: 'root'
})
export class LocalityService {

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private healthCheckService: HealthCheckService,
    private localityRepository: LocalityRepository,
    private localityRepositoryExtensions: LocalityRepositoryExtensions
  ) { }

  initializeLocalities(): Observable<Locality[]> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchLocalitiesFromApi().pipe(
            tap(async (localities) => {
              await this.localityRepository.saveAll(localities);
            }),
            catchError((error) => {
              console.error('Failed to fetch localities from API, falling back to local', error);
              // Return empty or paginated if needed. For init, empty is safer than full load.
              return of([]);
            })
          );
        } else {
          return of([]);
        }
      }),
      catchError(err => {
        console.error('Locality initialization failed:', err);
        return of([]); // Return an empty array on final failure
      })
    );
  }

  private fetchLocalitiesFromApi(): Observable<Locality[]> {
    return this.http.get<ApiResponse<Locality[]>>(`${environment.apiUrl}/api/v1/localities/all`).pipe(
      map(response => response.data)
    );
  }

  async getLocalities(): Promise<Locality[]> {
    console.warn('getLocalities is deprecated. Use getLocalitiesPaginated instead.');
    return [];
  }

  public getLocalitiesFromDB(): Observable<Locality[]> {
    console.warn('getLocalitiesFromDB is deprecated. Use getLocalitiesPaginated instead.');
    return of([]);
  }

  /**
   * Get paginated localities
   */
  getLocalitiesPaginated(page: number, size: number, filters?: LocalityRepositoryFilters): Observable<Page<Locality>> {
    return from(this.localityRepositoryExtensions.findAllPaginated(page, size, filters));
  }

  /**
   * Add a new locality locally
   */
  addLocality(name: string): Observable<Locality> {
    return from(this.localityRepository.addLocality({ name }));
  }
}
