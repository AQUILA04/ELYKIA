import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '@features/auth/service/auth.service';
import { DebtDocument, DebtSettlementMode } from '@features/debt/models/debt.model';
import { DebtService } from '@features/debt/services/debt.service';
import { UserProfile } from '@shared/models/user-profile.enum';
import { AlertService } from '@shared/service/alert.service';
import { FeatureFlagService, FeatureFlags } from '@shared/service/feature-flag.service';
import { formatFcfa } from '@shared/report-ui/fcfa.pipe';
import { UserService } from '@features/user/service/user.service';
import { CommercialMonthlyStock } from '../../models/commercial-stock.model';
import { CommercialStockService } from '../../services/commercial-stock.service';
import {
  LifecycleStep, RegularisationLine, canCancelDebt, canSettleDebt, isActiveDebt, lifecycle, linesTotal,
  regularisationLines, settledShare
} from '../../utils/stock-regularisation.util';
import { MonthRef, articleLabel, compareMonths, currentMonth, monthFromParams, monthLabel, percent } from '../../utils/stock-team.util';

interface PageData {
  stock: CommercialMonthlyStock | null;
  debt: DebtDocument | null;
  surplus: number;
  notFound: boolean;
  error: boolean;
}

const MODE_LABELS: Record<DebtSettlementMode, string> = {
  CASH: 'Espèces',
  SURPLUS_OFFSET: 'Avoir (surplus)',
  WRITE_OFF: 'Abandon (motif)'
};

/**
 * Régularisation d'un mois clôturé (/stock/my-stock/:commercial/:année/:mois/regularisation) :
 * retour en magasin ou dette marchandise pour le reste, puis règlement de la dette.
 * Les règles restent celles du serveur (mois passé, rôle « gestion des dettes », une dette active par stock).
 */
@Component({
  selector: 'app-stock-regularisation',
  templateUrl: './stock-regularisation.component.html',
  styleUrls: ['./stock-regularisation.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class StockRegularisationComponent implements OnInit, OnDestroy {
  collector = '';
  month: MonthRef = currentMonth();
  stock: CommercialMonthlyStock | null = null;
  debt: DebtDocument | null = null;
  lines: RegularisationLine[] = [];
  steps: LifecycleStep[] = [];
  surplusAvailable = 0;
  loading = true;
  notFound = false;
  error = false;

  canManageDebts = false;
  canReturn = false;
  isPromoter = false;
  busy = false;

  settleMode: DebtSettlementMode = 'CASH';
  settleAmount: number | null = null;
  settleNote = '';

  readonly modes: DebtSettlementMode[] = ['CASH', 'SURPLUS_OFFSET', 'WRITE_OFF'];
  readonly modeLabels = MODE_LABELS;
  readonly articleLabel = articleLabel;

  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockService: CommercialStockService,
    private debtService: DebtService,
    private authService: AuthService,
    private userService: UserService,
    private featureFlags: FeatureFlagService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.canManageDebts = this.authService.hasRole('ROLE_DEBT_MANAGEMENT') || this.authService.hasRole('ROLE_ADMIN');
    this.canReturn = this.featureFlags.isFeatureEnabled(FeatureFlags.StockReturnHistory)
      && (this.authService.hasRole('ROLE_PROMOTER') || this.authService.hasRole('ROLE_GESTIONNAIRE')
        || this.authService.hasRole('ROLE_ADMIN'));

    this.route.paramMap.pipe(
      switchMap(params => this.reload$.pipe(startWith(undefined), map(() => params))),
      switchMap(params => {
        const requested = params.get('collector') ?? '';
        this.collector = this.isPromoter ? (this.authService.getUsername() || requested) : requested;
        this.month = monthFromParams(params.get('year'), params.get('month'));
        this.loading = true;
        return this.loadPage();
      }),
      takeUntil(this.destroy$)
    ).subscribe(data => this.apply(data));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get monthTitle(): string {
    return monthLabel(this.month);
  }

  get closed(): boolean {
    return compareMonths(this.month, currentMonth()) < 0;
  }

  get total(): { quantity: number; amount: number } {
    return linesTotal(this.lines);
  }

  get activeDebt(): DebtDocument | null {
    return isActiveDebt(this.debt) ? this.debt : null;
  }

  get canCreateDebt(): boolean {
    return this.canManageDebts && this.closed && !!this.stock?.id && this.lines.length > 0 && !this.activeDebt;
  }

  get returnAllowed(): boolean {
    return this.canReturn && this.closed && this.lines.length > 0 && !this.activeDebt;
  }

  get canSettle(): boolean {
    return this.canManageDebts && canSettleDebt(this.activeDebt);
  }

  get canCancel(): boolean {
    return this.canManageDebts && canCancelDebt(this.activeDebt);
  }

  get debtShare(): number {
    return this.activeDebt ? settledShare(this.activeDebt) : 0;
  }

  get settleError(): string | null {
    const debt = this.activeDebt;
    if (!debt) {
      return null;
    }
    const amount = Number(this.settleAmount);
    if (!amount || amount <= 0) {
      return 'Indiquez un montant.';
    }
    if (amount > (debt.remainingAmount || 0) + 0.5) {
      return 'Le montant dépasse le reste à payer.';
    }
    if (this.settleMode === 'SURPLUS_OFFSET' && amount > this.surplusAvailable + 0.5) {
      return `Avoir disponible insuffisant (${formatFcfa(this.surplusAvailable)}).`;
    }
    if (this.settleMode === 'WRITE_OFF' && !this.settleNote.trim()) {
      return 'Un motif est obligatoire pour un abandon.';
    }
    return null;
  }

  get headline(): { label: string; tone: 'late' | 'ok' | 'idle' } {
    if (!this.closed) {
      return { label: 'Mois en cours', tone: 'idle' };
    }
    const debt = this.activeDebt;
    if (debt && debt.status !== 'SETTLED') {
      return { label: `Dette à régler · ${formatFcfa(debt.remainingAmount)}`, tone: 'late' };
    }
    if (this.lines.length) {
      return { label: `À régulariser · ${formatFcfa(this.total.amount)}`, tone: 'late' };
    }
    return { label: 'Mois régularisé', tone: 'ok' };
  }

  get sheetLink(): (string | number)[] {
    return ['/stock/my-stock', this.collector, this.month.year, this.month.month];
  }

  get teamQueryParams(): Record<string, number> {
    return { year: this.month.year, month: this.month.month };
  }

  setMode(mode: DebtSettlementMode): void {
    this.settleMode = mode;
    const remaining = this.activeDebt?.remainingAmount ?? 0;
    this.settleAmount = mode === 'SURPLUS_OFFSET' ? Math.min(remaining, this.surplusAvailable) : remaining;
  }

  openReturn(): void {
    if (!this.stock?.id) {
      return;
    }
    this.router.navigate(['/stock/return/historique'], {
      queryParams: { collector: this.collector, stockId: this.stock.id }
    });
  }

  createDebt(): void {
    const stockId = this.stock?.id;
    if (!stockId || !this.canCreateDebt) {
      return;
    }
    const message = `Constituer une dette de ${formatFcfa(this.total.amount)} pour ${this.collector} (${this.monthTitle}) ? `
      + 'Les quantités restantes passent en dette.';
    void this.alertService.showConfirmation('Constituer la dette', message, 'Oui', 'Annuler').then(confirmed => {
      if (!confirmed) {
        return;
      }
      this.run(this.debtService.createMerchandise(stockId), debt => `Dette ${debt.reference} constituée.`, 'Création de dette impossible.');
    });
  }

  settle(): void {
    const debt = this.activeDebt;
    if (!debt || !this.canSettle || this.settleError) {
      return;
    }
    const amount = Number(this.settleAmount);
    const message = `${this.modeLabels[this.settleMode]} : ${formatFcfa(amount)} sur la dette ${debt.reference} ?`;
    void this.alertService.showConfirmation('Enregistrer le règlement', message, 'Valider', 'Annuler').then(confirmed => {
      if (!confirmed) {
        return;
      }
      this.run(this.debtService.settle({
        debtIds: [debt.id],
        settlementMode: this.settleMode,
        amount,
        note: this.settleNote.trim() || undefined
      }), settlement => `Règlement ${settlement.reference} enregistré.`, 'Échec du règlement.');
    });
  }

  cancelDebt(): void {
    const debt = this.activeDebt;
    if (!debt || !this.canCancel) {
      return;
    }
    const message = `Annuler la dette ${debt.reference} ? Les quantités repassent en restant.`;
    void this.alertService.showConfirmation('Annuler la dette', message, 'Oui, annuler', 'Non').then(confirmed => {
      if (!confirmed) {
        return;
      }
      this.run(this.debtService.cancel(debt.id, 'Annulée depuis la régularisation du stock'),
        cancelled => `Dette ${cancelled.reference} annulée.`, 'Annulation impossible.');
    });
  }

  openDebt(): void {
    if (this.activeDebt) {
      void this.router.navigate(['/debts', this.activeDebt.id]);
    }
  }

  private run<T>(call: Observable<T>, success: (result: T) => string, failure: string): void {
    this.busy = true;
    call.subscribe({
      next: result => {
        this.busy = false;
        this.alertService.showSuccess(success(result));
        this.reload$.next();
      },
      error: (err: HttpErrorResponse) => {
        this.busy = false;
        this.alertService.showError(err?.error?.message || failure);
      }
    });
  }

  private loadPage(): Observable<PageData> {
    return this.stockService.getStockByDate(this.collector, this.month.year, this.month.month).pipe(
      switchMap(stock => {
        const debt$ = stock?.id
          ? this.debtService.byStock(stock.id).pipe(catchError(() => of(null)))
          : of(null);
        const surplus$ = this.canManageDebts
          ? this.debtService.search({ holder: this.collector, type: 'CASH_SURPLUS', size: 50 }).pipe(
            map(page => (page?.content ?? [])
              .filter(d => d.status === 'OPEN' || d.status === 'PARTIALLY_SETTLED')
              .reduce((sum, d) => sum + (d.remainingAmount || 0), 0)),
            catchError(() => of(0)))
          : of(0);
        return forkJoin({ debt: debt$, surplus: surplus$ }).pipe(
          map(({ debt, surplus }) => ({ stock, debt, surplus, notFound: false, error: false }))
        );
      }),
      catchError((err: HttpErrorResponse) => of({
        stock: null, debt: null, surplus: 0, notFound: err?.status === 404, error: err?.status !== 404
      }))
    );
  }

  private apply(data: PageData): void {
    this.stock = data.stock;
    this.debt = data.debt;
    this.surplusAvailable = data.surplus;
    this.notFound = data.notFound;
    this.error = data.error;
    this.lines = regularisationLines(data.stock?.items ?? []);
    const items = data.stock?.items ?? [];
    const taken = items.reduce((sum, item) => sum + (item.quantityTaken || 0), 0);
    const sold = items.reduce((sum, item) => sum + (item.quantitySold || 0), 0);
    this.steps = lifecycle({
      closed: this.closed,
      soldRate: percent(sold, taken),
      remainingQuantity: this.total.quantity,
      debt: data.debt
    });
    this.settleMode = 'CASH';
    this.settleAmount = this.activeDebt?.remainingAmount ?? null;
    this.settleNote = '';
    this.loading = false;
  }
}
