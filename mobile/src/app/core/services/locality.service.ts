import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { Locality } from '../../models/locality.model';
import { HealthCheckService } from './health-check.service';
import { LocalityRepository } from '../repositories/locality.repository';
import { LocalityRepositoryExtensions, LocalityRepositoryFilters } from '../repositories/locality.repository.extensions';
import { Page } from '../repositories/repository.interface';
import { LocalitySyncService } from './sync/locality-sync.service';
import { OnlineFirstWriteCoordinator } from './online-first-write.coordinator';

@Injectable({
  providedIn: 'root'
})
export class LocalityService {

  constructor(
    private readonly http: HttpClient,
    private readonly healthCheckService: HealthCheckService,
    private readonly localityRepository: LocalityRepository,
    private readonly localityRepositoryExtensions: LocalityRepositoryExtensions,
    private readonly localitySyncService: LocalitySyncService,
    private readonly onlineFirstWriteCoordinator: OnlineFirstWriteCoordinator
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
              return of([]);
            })
          );
        } else {
          return of([]);
        }
      }),
      catchError(err => {
        console.error('Locality initialization failed:', err);
        return of([]);
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

  getLocalitiesPaginated(page: number, size: number, filters?: LocalityRepositoryFilters): Observable<Page<Locality>> {
    return from(this.localityRepositoryExtensions.findAllPaginated(page, size, filters));
  }

  /**
   * Crée une localité (online-first si hybride + backend joignable).
   */
  addLocality(name: string, forceOffline = false): Observable<Locality> {
    return from(this.createLocalityOnlineFirst(name, forceOffline));
  }

  private async createLocalityOnlineFirst(name: string, forceOffline: boolean): Promise<Locality> {
    const writeResult = await this.onlineFirstWriteCoordinator.executeWrite({
      entityLabel: 'locality',
      forceOffline,
      saveOffline: () => this.localityRepository.addLocality({ name }),
      saveOnline: async () => {
        const serverLocality = await this.localitySyncService.postCreateLocality({ name });
        const persisted: Locality = {
          ...serverLocality,
          id: String(serverLocality.id),
          name,
          isLocal: false,
          isSync: true,
          createdAt: serverLocality.createdAt || new Date().toISOString()
        };
        await this.localityRepository.saveAll([persisted]);
        return persisted;
      }
    });
    return writeResult.data;
  }
}
