import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { ApiResponse } from '../../models/api-response.model';
import { Locality } from '../../models/locality.model';
import { HealthCheckService } from './health-check.service';

@Injectable({
  providedIn: 'root'
})
export class LocalityService {

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private healthCheckService: HealthCheckService
  ) { }

  initializeLocalities(): Observable<Locality[]> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchLocalitiesFromApi().pipe(
            tap(localities => {
              this.dbService.saveLocalities(localities);
            }),
            catchError((error) => {
              console.error('Failed to fetch localities from API, falling back to local', error);
              return from(this.dbService.getLocalities()).pipe(
                map(localLocalities => {
                  if (localLocalities && localLocalities.length > 0) {
                    return localLocalities;
                  } else {
                    throw new Error('Impossible de charger les localités. Veuillez vérifier votre connexion ou synchroniser.');
                  }
                })
              );
            })
          );
        } else {
          return from(this.dbService.getLocalities()).pipe(
            map(localLocalities => {
              if (localLocalities && localLocalities.length > 0) {
                return localLocalities;
              } else {
                throw new Error('Impossible de charger les localités. Veuillez vérifier votre connexion ou synchroniser.');
              }
            })
          );
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
    return await this.dbService.getLocalities();
  }

  public getLocalitiesFromDB(): Observable<Locality[]> {
    return from(this.getLocalities())
  }
}
