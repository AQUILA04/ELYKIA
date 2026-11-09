import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subscription, interval } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from './token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';

/**
 * Le paramètre RESTRICT_UNIT_PRICE_VISIBILITY est lu une fois, puis tenu 6 heures.
 * Les écrans métier lisent {@link showUnitPrice$}. Le rechargement forcé se fait
 * à l'accueil, sur la page Paramètres, et à l'échéance du délai.
 */
@Injectable({
  providedIn: 'root'
})
export class UnitPriceVisibilityService implements OnDestroy {
  static readonly KEY = 'RESTRICT_UNIT_PRICE_VISIBILITY';
  static readonly TTL_MS = 6 * 60 * 60 * 1000;

  private restricted = true;
  private loadedAt = 0;
  private inFlight?: Observable<boolean>;
  private readonly showSubject = new BehaviorSubject<boolean>(false);
  readonly showUnitPrice$ = this.showSubject.asObservable();
  private readonly ttlSub: Subscription;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private userService: UserService
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

  /** Recharge si aucune valeur n'est connue ou si le délai de 6 heures est dépassé. */
  ensureLoaded(): Observable<boolean> {
    return this.refresh(false);
  }

  /** `force` ignore le délai (accueil, page Paramètres, enregistrement). */
  refresh(force = false): Observable<boolean> {
    if (!force && this.loadedAt && Date.now() - this.loadedAt < UnitPriceVisibilityService.TTL_MS) {
      this.publish();
      return of(this.snapshot);
    }
    if (!this.tokenStorage.getToken()) {
      this.publish();
      return of(this.snapshot);
    }
    if (!force && this.inFlight) {
      return this.inFlight;
    }
    const request = this.http
      .get<boolean>(`${environment.apiUrl}/api/parameters/enabled/${UnitPriceVisibilityService.KEY}`)
      .pipe(
        tap(enabled => {
          this.restricted = enabled === true;
          this.loadedAt = Date.now();
          this.publish();
        }),
        map(() => this.snapshot),
        catchError(() => {
          this.publish();
          return of(this.snapshot);
        }),
        finalize(() => {
          if (this.inFlight === request) {
            this.inFlight = undefined;
          }
        }),
        shareReplay(1)
      );
    this.inFlight = request;
    return request;
  }

  private publish(): void {
    const privileged = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.showSubject.next(!this.restricted || privileged);
  }
}
