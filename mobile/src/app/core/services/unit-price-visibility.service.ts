import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, interval, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ParameterService } from './parameter.service';
import { AuthService } from './auth.service';
import { Parameter } from '../../models/parameter.model';

const PRIVILEGED_PROFILES = ['GESTIONNAIRE', 'ADMIN', 'SUPER_ADMIN'];

@Injectable({
  providedIn: 'root'
})
export class UnitPriceVisibilityService implements OnDestroy {
  static readonly KEY = 'RESTRICT_UNIT_PRICE_VISIBILITY';
  static readonly TTL_MS = 6 * 60 * 60 * 1000;

  private restricted = true;
  private loadedAt = 0;
  private readonly showSubject = new BehaviorSubject<boolean>(false);
  readonly showUnitPrice$ = this.showSubject.asObservable();
  private readonly ttlSub: Subscription;

  constructor(
    private http: HttpClient,
    private parameterService: ParameterService,
    private authService: AuthService
  ) {
    this.publish();
    this.ttlSub = interval(UnitPriceVisibilityService.TTL_MS).subscribe(() => {
      this.refresh(true).subscribe();
    });
  }

  ngOnDestroy(): void {
    this.ttlSub.unsubscribe();
  }

  get snapshot(): boolean {
    return this.showSubject.value;
  }

  async syncFromLocal(): Promise<void> {
    const raw = await this.parameterService.getParameterValue(UnitPriceVisibilityService.KEY);
    this.restricted = raw == null ? true : raw === 'true';
    this.loadedAt = Date.now();
    this.publish();
  }

  refresh(force = false): Observable<boolean> {
    if (!force && this.loadedAt && Date.now() - this.loadedAt < UnitPriceVisibilityService.TTL_MS) {
      this.publish();
      return of(this.snapshot);
    }
    return this.http
      .get<boolean>(`${environment.apiUrl}/api/parameters/enabled/${UnitPriceVisibilityService.KEY}`)
      .pipe(
        tap(enabled => {
          this.restricted = enabled === true;
          this.loadedAt = Date.now();
          this.publish();
          const parameter: Parameter = {
            key: UnitPriceVisibilityService.KEY,
            value: String(enabled === true)
          };
          void this.parameterService.persistOne(parameter);
        }),
        map(() => this.snapshot),
        catchError(() => {
          this.publish();
          return of(this.snapshot);
        })
      );
  }

  private publish(): void {
    const profil = this.authService.currentUser?.profil;
    const name = typeof profil === 'string' ? profil : '';
    const privileged = PRIVILEGED_PROFILES.includes(name);
    this.showSubject.next(!this.restricted || privileged);
  }
}
