import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { Commercial } from '../../models/commercial.model';
import { ApiResponse } from '../../models/api-response.model';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { Store } from '@ngrx/store';
import { HealthCheckService } from './health-check.service';

@Injectable({
  providedIn: 'root'
})
export class CommercialService {

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private store: Store,
    private healthCheckService: HealthCheckService
  ) {
  }

  initializeCommercial(commercialUsername: string): Observable<Commercial> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchCommercialFromApi(commercialUsername).pipe(
            tap(async (commercial) => {
              if (commercial) {
                await this.dbService.saveCommercial(commercial);
              }
            }),
            catchError(async (error) => {
              console.error('Failed to fetch commercial data from API, attempting local:', error);
              return this.getLocalCommercial();
            })
          );
        } else {
          return from(this.getLocalCommercial());
        }
      })
    );
  }

  private fetchCommercialFromApi(commercialUsername: string): Observable<Commercial> {
    const url = `${environment.apiUrl}/api/v1/promoters/all`;
    return this.http.get<ApiResponse<Commercial[]>>(url).pipe(
      map(response => {
        const commercial = response.data.find(c => c.username === commercialUsername);
        if (commercial) {
          return commercial;
        } else {
          throw new Error('Commercial not found in API response.');
        }
      })
    );
  }

  private async getLocalCommercial(): Promise<Commercial> {
    const commercial = await this.dbService.getCommercial();
    if (commercial) {
      return commercial;
    } else {
      console.error('No commercial data available locally.');
      throw new Error('Impossible de charger les données du commercial. Veuillez vérifier votre connexion ou synchroniser.');
    }
  }

  /**
   * Retourne les informations du commercial sous forme d'Observable.
   * Utilise la logique de récupération locale existante.
   */
  public getCommercials(): Observable<Commercial> {
    // L'opérateur 'from' de RxJS convertit une Promise en Observable
    return from(this.getLocalCommercial());
  }

}
