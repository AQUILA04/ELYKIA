import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ParameterService } from './parameter.service';
import { AuthService } from './auth.service';
import { Parameter } from '../../models/parameter.model';

const PRIVILEGED_PROFILES = ['GESTIONNAIRE', 'ADMIN', 'SUPER_ADMIN'];

/**
 * Deux paramètres règlent le prix unitaire :
 * - RESTRICT_CASH_SALE_UNIT_PRICE_VISIBILITY : ventes comptant, commandes et livraisons tontine ;
 * - RESTRICT_UNIT_PRICE_VISIBILITY : tout le reste.
 * Les écrans tontine lisent {@link showCashUnitPrice$} (règle « comptant »).
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
  private readonly showSubject = new BehaviorSubject<boolean>(false);
  private readonly showCashSubject = new BehaviorSubject<boolean>(false);
  /** Règle générale. */
  readonly showUnitPrice$ = this.showSubject.asObservable();
  /** Règle des ventes comptant, reprise pour les commandes et livraisons tontine. */
  readonly showCashUnitPrice$ = this.showCashSubject.asObservable();
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

  /** Règle générale. */
  get snapshot(): boolean {
    return this.showSubject.value;
  }

  /** Règle des ventes comptant, commandes et livraisons tontine. */
  get cashSnapshot(): boolean {
    return this.showCashSubject.value;
  }

  /** `CASH` (ou tontine) suit le paramètre « comptant » ; sinon règle générale. */
  snapshotFor(saleType?: string | null): boolean {
    return UnitPriceVisibilityService.isCash(saleType) ? this.cashSnapshot : this.snapshot;
  }

  showUnitPriceFor$(saleType?: string | null): Observable<boolean> {
    return UnitPriceVisibilityService.isCash(saleType) ? this.showCashUnitPrice$ : this.showUnitPrice$;
  }

  static isCash(saleType?: string | null): boolean {
    return saleType === 'CASH';
  }

  async syncFromLocal(): Promise<void> {
    const raw = await this.parameterService.getParameterValue(UnitPriceVisibilityService.KEY);
    const rawCash = await this.parameterService.getParameterValue(UnitPriceVisibilityService.CASH_SALE_KEY);
    this.restricted = raw == null ? true : raw === 'true';
    this.cashRestricted = rawCash == null ? true : rawCash === 'true';
    this.loadedAt = Date.now();
    this.publish();
  }

  refresh(force = false): Observable<boolean> {
    if (!force && this.loadedAt && Date.now() - this.loadedAt < UnitPriceVisibilityService.TTL_MS) {
      this.publish();
      return of(this.snapshot);
    }
    return forkJoin({
      general: this.readEnabled(UnitPriceVisibilityService.KEY),
      cash: this.readEnabled(UnitPriceVisibilityService.CASH_SALE_KEY)
    }).pipe(
      tap(({ general, cash }) => {
        if (general !== null) {
          this.restricted = general;
          this.persist(UnitPriceVisibilityService.KEY, general);
        }
        if (cash !== null) {
          this.cashRestricted = cash;
          this.persist(UnitPriceVisibilityService.CASH_SALE_KEY, cash);
        }
        this.loadedAt = general !== null && cash !== null ? Date.now() : 0;
        this.publish();
      }),
      map(() => this.snapshot),
      catchError(() => {
        this.publish();
        return of(this.snapshot);
      })
    );
  }

  /** `null` en cas d'erreur réseau : la valeur connue est gardée. */
  private readEnabled(key: string): Observable<boolean | null> {
    return this.http
      .get<boolean>(`${environment.apiUrl}/api/parameters/enabled/${key}`)
      .pipe(
        map(enabled => enabled === true),
        catchError(() => of(null))
      );
  }

  private persist(key: string, restricted: boolean): void {
    const parameter: Parameter = { key, value: String(restricted) };
    void this.parameterService.persistOne(parameter);
  }

  private publish(): void {
    const profil = this.authService.currentUser?.profil;
    const name = typeof profil === 'string' ? profil : '';
    const privileged = PRIVILEGED_PROFILES.includes(name);
    this.showSubject.next(!this.restricted || privileged);
    this.showCashSubject.next(!this.cashRestricted || privileged);
  }
}
