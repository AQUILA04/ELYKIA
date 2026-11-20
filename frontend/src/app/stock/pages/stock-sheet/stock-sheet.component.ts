import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest, of } from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/service/auth.service';
import { DebtService } from 'src/app/debt/services/debt.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AlertService } from 'src/app/shared/service/alert.service';
import { GuidedTourService } from 'src/app/shared/report-ui/guided-tour/guided-tour.service';
import { formatFcfa } from 'src/app/shared/report-ui/fcfa.pipe';
import { UserService } from 'src/app/user/service/user.service';
import { CommercialMonthlyStock, CommercialMonthlyStockItem } from '../../models/commercial-stock.model';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { STOCK_SHEET_TOUR } from '../../stock-tours';
import {
  LOW_RECOVERY_RATE, MonthRef, SheetTotals, articleLabel, compareMonths, currentMonth, debtValue, isOpenItem,
  monthFromParams, monthLabel, percent, quantitySplit, remainingValue, searchItems, sheetTotals, shiftMonth, sortItems
} from '../../utils/stock-team.util';

type SheetPanel = 'sales' | 'article' | null;

/** Fiche stock d'un commercial pour un mois (/stock/my-stock/:collector/:year/:month). */
@Component({
  selector: 'app-stock-sheet',
  templateUrl: './stock-sheet.component.html',
  styleUrls: ['./stock-sheet.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class StockSheetComponent implements OnInit, OnDestroy {
  collector = '';
  month: MonthRef = currentMonth();
  stock: CommercialMonthlyStock | null = null;
  totals: SheetTotals | null = null;
  items: CommercialMonthlyStockItem[] = [];
  loading = true;
  notFound = false;
  error = false;

  showAll = false;
  search = '';
  panel: SheetPanel = null;
  panelItem: CommercialMonthlyStockItem | null = null;

  isPromoter = false;
  previousCollector: string | null = null;
  nextCollector: string | null = null;
  exporting = false;
  creatingDebt = false;

  readonly articleLabel = articleLabel;
  readonly remainingValue = remainingValue;
  readonly debtValue = debtValue;
  readonly isOpenItem = isOpenItem;

  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();
  private tourChecked = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockService: CommercialStockService,
    private debtService: DebtService,
    private authService: AuthService,
    private userService: UserService,
    private alertService: AlertService,
    private tour: GuidedTourService
  ) { }

  ngOnInit(): void {
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);

    combineLatest([this.route.paramMap, this.reload$.pipe(startWith(undefined))]).pipe(
      map(([params]) => params),
      switchMap(params => {
        const requested = params.get('collector') ?? '';
        this.collector = this.isPromoter ? (this.authService.getUsername() || requested) : requested;
        this.month = monthFromParams(params.get('year'), params.get('month'));
        this.loading = true;
        this.error = false;
        this.notFound = false;
        this.loadNeighbours();
        return this.stockService.getStockByDate(this.collector, this.month.year, this.month.month).pipe(
          catchError((err: HttpErrorResponse) => {
            if (err?.status === 404) {
              this.notFound = true;
            } else {
              this.error = true;
            }
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(stock => {
      this.stock = stock;
      this.totals = stock ? sheetTotals(stock) : null;
      this.items = stock ? sortItems(stock.items ?? []) : [];
      this.loading = false;
      this.syncPanelFromUrl();
      if (stock) {
        this.maybeStartTour();
      }
    });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(() => this.syncPanelFromUrl());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get monthTitle(): string {
    return monthLabel(this.month);
  }

  get isCurrentMonth(): boolean {
    return compareMonths(this.month, currentMonth()) === 0;
  }

  get openCount(): number {
    return this.items.filter(isOpenItem).length;
  }

  get visibleItems(): CommercialMonthlyStockItem[] {
    const scoped = this.showAll ? this.items : this.items.filter(isOpenItem);
    return searchItems(scoped, this.search);
  }

  get hiddenSoldCount(): number {
    return this.showAll ? 0 : this.items.length - this.openCount;
  }

  get split() {
    const t = this.totals;
    return quantitySplit({
      taken: t?.quantityTaken ?? 0,
      sold: t?.quantitySold ?? 0,
      returned: t?.quantityReturned ?? 0,
      debt: t?.quantityDebt ?? 0,
      remaining: t?.quantityRemaining ?? 0
    });
  }

  get recoveryLow(): boolean {
    return !!this.totals && this.totals.dueValue > 0.5 && this.totals.recoveryRate < LOW_RECOVERY_RATE;
  }

  get teamQueryParams(): Record<string, number> | null {
    return this.isCurrentMonth ? null : { year: this.month.year, month: this.month.month };
  }

  get classicQueryParams(): Record<string, string | number> {
    return { channel: 'credit', collector: this.collector };
  }

  get canCreateDebt(): boolean {
    const stock = this.stock;
    if (!stock?.id || this.isCurrentMonth || compareMonths(this.month, currentMonth()) > 0) {
      return false;
    }
    if (stock.recoverySummary?.merchandiseDebtId || !(stock.items ?? []).some(i => (i.quantityRemaining || 0) > 0)) {
      return false;
    }
    return this.authService.hasRole('ROLE_DEBT_MANAGEMENT') || this.authService.hasRole('ROLE_ADMIN');
  }

  soldPercent(item: CommercialMonthlyStockItem): number {
    return percent(item.quantitySold, item.quantityTaken);
  }

  previousMonth(): void {
    this.goTo(this.collector, shiftMonth(this.month, -1));
  }

  nextMonth(): void {
    if (!this.isCurrentMonth) {
      this.goTo(this.collector, shiftMonth(this.month, 1));
    }
  }

  goToCollector(collector: string | null): void {
    if (collector) {
      this.goTo(collector, this.month);
    }
  }

  setShowAll(all: boolean): void {
    this.showAll = all;
  }

  openSales(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { panel: 'sales', item: null }, queryParamsHandling: 'merge' });
  }

  openArticle(item: CommercialMonthlyStockItem): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { panel: 'article', item: item.id }, queryParamsHandling: 'merge' });
  }

  closePanel(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { panel: null, item: null }, queryParamsHandling: 'merge' });
  }

  refresh(): void {
    this.reload$.next();
  }

  startTour(): void {
    this.tour.start(STOCK_SHEET_TOUR);
  }

  exportPdf(): void {
    if (!this.stock || this.exporting) {
      return;
    }
    this.exporting = true;
    this.stockService.exportPdf(this.collector, this.month.year, this.month.month).subscribe({
      next: data => {
        const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `rapport_stock_${this.collector}_${monthLabel(this.month).toLowerCase().replace(' ', '_')}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
        this.alertService.toastSuccess(`Rapport de ${this.collector} — ${this.monthTitle} téléchargé`);
      },
      error: () => {
        this.exporting = false;
        this.alertService.toastError('Erreur lors du téléchargement du PDF');
      }
    });
  }

  createDebt(): void {
    const stock = this.stock;
    if (!stock?.id || !this.canCreateDebt || !this.totals) {
      return;
    }
    const stockId = stock.id;
    const message = `Créer une dette de ${formatFcfa(this.totals.remainingValue)} pour ${this.collector} (${this.monthTitle}) ?`;
    this.alertService.showConfirmation('Confirmation', message, 'Oui', 'Annuler').then(confirmed => {
      if (!confirmed) {
        return;
      }
      this.creatingDebt = true;
      this.debtService.createMerchandise(stockId).subscribe({
        next: debt => {
          this.creatingDebt = false;
          this.alertService.showSuccess(`Dette ${debt.reference} créée.`);
          this.refresh();
        },
        error: err => {
          this.creatingDebt = false;
          this.alertService.showError(err?.error?.message || 'Création de dette impossible.');
        }
      });
    });
  }

  openDebt(): void {
    const debtId = this.stock?.recoverySummary?.merchandiseDebtId;
    if (debtId) {
      this.router.navigate(['/debts', debtId]);
    }
  }

  trackItem(_: number, item: CommercialMonthlyStockItem): number | string {
    return item.id ?? articleLabel(item);
  }

  private syncPanelFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const panel = params.get('panel');
    if (panel === 'sales' && this.stock?.id) {
      this.panel = 'sales';
      this.panelItem = null;
      return;
    }
    if (panel === 'article') {
      const id = Number(params.get('item'));
      const item = this.items.find(i => i.id === id) ?? null;
      this.panel = item ? 'article' : null;
      this.panelItem = item;
      return;
    }
    this.panel = null;
    this.panelItem = null;
  }

  /** Commercial précédent / suivant dans l'ordre de la vue équipe (gestionnaires seulement). */
  private loadNeighbours(): void {
    this.previousCollector = null;
    this.nextCollector = null;
    if (this.isPromoter) {
      return;
    }
    const collector = this.collector;
    this.stockService.getTeamOverview(this.month.year, this.month.month).pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$)
    ).subscribe(overview => {
      if (!overview || collector !== this.collector) {
        return;
      }
      const order = overview.lines.map(line => line.collector);
      const index = order.indexOf(collector);
      if (index >= 0) {
        this.previousCollector = order[index - 1] ?? null;
        this.nextCollector = order[index + 1] ?? null;
      }
    });
  }

  private maybeStartTour(): void {
    if (this.tourChecked) {
      return;
    }
    this.tourChecked = true;
    setTimeout(() => this.tour.startIfFirstVisit(STOCK_SHEET_TOUR), 300);
  }

  private goTo(collector: string, month: MonthRef): void {
    this.router.navigate(['/stock/my-stock', collector, month.year, month.month]);
  }
}

