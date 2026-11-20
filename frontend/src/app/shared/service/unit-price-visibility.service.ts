import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of, Subscription, interval } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenStorageService } from './token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';

/**
 * Deux paramètres règlent le prix unitaire :
 * - RESTRICT_CASH_SALE_UNIT_PRICE_VISIBILITY pour les ventes comptant (type CASH) ;
 * - RESTRICT_UNIT_PRICE_VISIBILITY pour tout le reste.
 * Ils sont lus une fois, puis tenus 6 heures. Les écrans d'une vente lisent
 * {@link showUnitPriceFor$} avec le type de la vente ; les autres lisent {@link showUnitPrice$}.
 * Le rechargement forcé se fait à l'accueil, sur la page Paramètres, et à l'échéance du délai.
 */
@Injectable({
  providedIn: 'root'
})
export class UnitPriceVisibilityService implements OnDestroy {
  static readonly KEY = 'RESTRICT_UNIT_PRICE_VISIBILITY';
  static readonly CASH_SALE_KEY = 'RESTRICT_CASH_SALE_UNIT_PRICE_VISIBILITY';
  static readonly TTL_MS = 6 * 60 * 60 * 1000;

  private restricted = true;
  private cashRestricted = true;
  private loadedAt = 0;
  private inFlight?: Observable<boolean>;
  private readonly showSubject = new BehaviorSubject<boolean>(false);
  private readonly showCashSubject = new BehaviorSubject<boolean>(false);
  /** Règle générale (hors ventes comptant). */
  readonly showUnitPrice$ = this.showSubject.asObservable();
  /** Règle des ventes comptant. */
  readonly showCashUnitPrice$ = this.showCashSubject.asObservable();
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

  /** Règle générale (hors ventes comptant). */
  get snapshot(): boolean {
    return this.showSubject.value;
  }

  /** Règle des ventes comptant. */
  get cashSnapshot(): boolean {
    return this.showCashSubject.value;
  }

  /** Règle applicable au type de vente : CASH suit son paramètre, les autres le paramètre général. */
  snapshotFor(saleType?: string | null): boolean {
    return UnitPriceVisibilityService.isCash(saleType) ? this.cashSnapshot : this.snapshot;
  }

  showUnitPriceFor$(saleType?: string | null): Observable<boolean> {
    return UnitPriceVisibilityService.isCash(saleType) ? this.showCashUnitPrice$ : this.showUnitPrice$;
  }

  static isCash(saleType?: string | null): boolean {
    return saleType === 'CASH';
  }

  /** Recharge si aucune valeur n'est connue ou si le délai de 6 heures est dépassé. */
  ensureLoaded(): Observable<boolean> {
    return this.refresh(false);
  }

  /** `force` ignore le délai (accueil, page Paramètres, enregistrement). Émet la règle générale. */
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
    const request = forkJoin({
      general: this.readEnabled(UnitPriceVisibilityService.KEY),
      cash: this.readEnabled(UnitPriceVisibilityService.CASH_SALE_KEY)
    }).pipe(
      tap(({ general, cash }) => {
        if (general !== null) {
          this.restricted = general;
        }
        if (cash !== null) {
          this.cashRestricted = cash;
        }
        // Une lecture en échec sera retentée au prochain ensureLoaded().
        this.loadedAt = general !== null && cash !== null ? Date.now() : 0;
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

  /** `null` en cas d'erreur : la valeur connue est alors gardée. */
  private readEnabled(key: string): Observable<boolean | null> {
    return this.http
      .get<boolean>(`${environment.apiUrl}/api/parameters/enabled/${key}`)
      .pipe(
        map(enabled => enabled === true),
        catchError(() => of(null))
      );
  }

  private publish(): void {
    const privileged = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.showSubject.next(!this.restricted || privileged);
    this.showCashSubject.next(!this.cashRestricted || privileged);
  }
}
