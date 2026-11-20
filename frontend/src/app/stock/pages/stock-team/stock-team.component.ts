import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/client/service/client.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { UserService } from 'src/app/user/service/user.service';
import { GuidedTourService } from 'src/app/shared/report-ui/guided-tour/guided-tour.service';
import { StockTeamLine, StockTeamOverview, StockToSettle } from '../../models/stock-team.model';
import { StockChannel } from '../../models/stock-channel';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { StockChannelService } from '../../services/stock-channel.service';
import { STOCK_TEAM_TOUR } from '../../stock-tours';
import {
  LOW_RECOVERY_RATE, MonthRef, TeamFilter, compareMonths, currentMonth, daysBeforeClose, filterCounts,
  matchesFilter, monthFromParams, monthLabel, percent, shiftMonth
} from '../../utils/stock-team.util';

const FILTERS: TeamFilter[] = ['all', 'remaining', 'debt', 'low'];

/**
 * Vue équipe du stock commercial mensuel (/stock/my-stock), ouverte par le menu.
 * Un commercial est envoyé directement sur sa fiche. L'ancienne présentation reste sur /classic.
 */
@Component({
  selector: 'app-stock-team',
  templateUrl: './stock-team.component.html',
  styleUrls: ['./stock-team.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class StockTeamComponent implements OnInit, OnDestroy {
  channel: StockChannel = 'credit';
  month: MonthRef = currentMonth();
  filter: TeamFilter = 'all';
  selectedCollector: string | null = null;

  overview: StockTeamOverview | null = null;
  toSettle: StockToSettle[] = [];
  lines: StockTeamLine[] = [];
  counts: Record<TeamFilter, number> = { all: 0, remaining: 0, debt: 0, low: 0 };
  agents: { username: string; firstname?: string; lastname?: string }[] = [];
  loading = true;
  error = false;
  showStockReturnHistory = false;

  readonly filters = FILTERS;
  readonly filterLabels: Record<TeamFilter, string> = {
    all: 'Tous',
    remaining: 'Avec stock restant',
    debt: 'Avec dette',
    low: `Recouvrement < ${LOW_RECOVERY_RATE} %`
  };
  readonly lowRate = LOW_RECOVERY_RATE;
  /** Au-delà, le bandeau résume les mois restants. */
  readonly toSettleShown = 8;

  private readonly destroy$ = new Subject<void>();
  private readonly reload$ = new Subject<void>();
  private tourChecked = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockService: CommercialStockService,
    private stockChannel: StockChannelService,
    private clientService: ClientService,
    private userService: UserService,
    private authService: AuthService,
    private featureFlags: FeatureFlagService,
    private tour: GuidedTourService
  ) { }

  ngOnInit(): void {
    this.showStockReturnHistory = this.featureFlags.isFeatureEnabled(FeatureFlags.StockReturnHistory);
    if (!this.userService.hasProfile(UserProfile.PROMOTER)) {
      this.clientService.getAgents().pipe(takeUntil(this.destroy$)).subscribe({
        next: agents => this.agents = agents ?? [],
        error: () => this.agents = []
      });
    }

    this.route.queryParamMap.pipe(
      map(params => this.readParams(params)),
      switchMap(ready => ready ? this.load() : of(null)),
      takeUntil(this.destroy$)
    ).subscribe();

    this.reload$.pipe(switchMap(() => this.load()), takeUntil(this.destroy$)).subscribe();
    this.loadToSettle();
  }

  /** Mois passés dont un reste n'est ni retourné ni en dette (bandeau « à régulariser »). */
  private loadToSettle(): void {
    this.stockService.getToSettle().pipe(catchError(() => of([] as StockToSettle[])), takeUntil(this.destroy$))
      .subscribe(rows => this.toSettle = rows ?? []);
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

  get closeInDays(): number {
    return daysBeforeClose();
  }

  get visibleLines(): StockTeamLine[] {
    return this.lines.filter(line => matchesFilter(line, this.filter)
      && (!this.selectedCollector || line.collector === this.selectedCollector));
  }

  get classicQueryParams(): Record<string, string> {
    return this.channel === 'tontine' ? { channel: 'tontine' } : { channel: 'credit' };
  }

  splitOf(overview: StockTeamOverview): { sold: number; returned: number; remaining: number; debt: number } {
    const t = overview.totals;
    return {
      sold: percent(t.soldValue, t.takenValue),
      returned: percent(t.returnedValue, t.takenValue),
      debt: percent(t.debtValue, t.takenValue),
      remaining: percent(t.remainingValue, t.takenValue)
    };
  }

  rateClass(rate: number, due: number): string {
    if (due <= 0.5) {
      return 'rate-idle';
    }
    return rate < LOW_RECOVERY_RATE ? 'rate-low' : 'rate-ok';
  }

  previousMonth(): void {
    this.goToMonth(shiftMonth(this.month, -1));
  }

  nextMonth(): void {
    if (!this.isCurrentMonth) {
      this.goToMonth(shiftMonth(this.month, 1));
    }
  }

  setFilter(filter: TeamFilter): void {
    this.navigate({ filter: filter === 'all' ? null : filter });
  }

  onCollectorChange(collector: string | null): void {
    this.navigate({ collector: collector || null });
  }

  onChannelChange(channel: StockChannel): void {
    this.navigate({ channel });
  }

  openSheet(line: StockTeamLine): void {
    this.router.navigate(['/stock/my-stock', line.collector, this.month.year, this.month.month]);
  }

  refresh(): void {
    this.reload$.next();
    this.loadToSettle();
  }

  get visibleToSettle(): StockToSettle[] {
    return this.selectedCollector ? this.toSettle.filter(row => row.collector === this.selectedCollector) : this.toSettle;
  }

  get toSettleTotal(): number {
    return this.visibleToSettle.reduce((sum, row) => sum + (row.remainingValue || 0), 0);
  }

  monthOf(row: StockToSettle): string {
    return monthLabel({ year: row.year, month: row.month });
  }

  startTour(): void {
    this.tour.start(STOCK_TEAM_TOUR);
  }

  trackLine(_: number, line: StockTeamLine): string {
    return line.collector;
  }

  searchAgent = (term: string, item: { username: string; firstname?: string; lastname?: string }) => {
    const text = `${item.username} ${item.firstname ?? ''} ${item.lastname ?? ''}`.toLowerCase();
    return text.includes(term.toLowerCase());
  };

  /** Lit l'URL ; renvoie faux quand la page redirige ailleurs (fiche, lien ancien, tontine). */
  private readParams(params: ParamMap): boolean {
    const collector = params.get('collector');
    const year = params.get('year');
    const month = params.get('month');

    // Ancien lien « ventes liées » (détail d'un crédit) : la fiche ouvre le panneau des ventes.
    const openSales = params.get('openSales');
    if (openSales && collector && year && month) {
      this.router.navigate(['/stock/my-stock', collector, +year, +month], {
        queryParams: { panel: 'sales' },
        replaceUrl: true
      });
      return false;
    }

    const channel = this.stockChannel.resolve(params.get('channel'));
    if (params.get('channel') !== channel) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { channel },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return false;
    }
    this.channel = channel;
    this.stockChannel.remember(channel);
    this.month = monthFromParams(year ?? undefined, month ?? undefined);

    if (channel === 'credit' && this.userService.hasProfile(UserProfile.PROMOTER)) {
      const own = this.authService.getUsername();
      if (own) {
        this.router.navigate(['/stock/my-stock', own, this.month.year, this.month.month], { replaceUrl: true });
        return false;
      }
    }

    const filter = params.get('filter') as TeamFilter | null;
    this.filter = filter && FILTERS.includes(filter) ? filter : 'all';
    this.selectedCollector = collector || null;
    return channel === 'credit';
  }

  private load() {
    this.loading = true;
    this.error = false;
    return this.stockService.getTeamOverview(this.month.year, this.month.month).pipe(
      tap(overview => {
        this.overview = overview;
        this.lines = overview?.lines ?? [];
        this.counts = filterCounts(this.lines);
        this.loading = false;
        this.maybeStartTour();
      }),
      catchError(() => {
        this.overview = null;
        this.lines = [];
        this.counts = filterCounts([]);
        this.loading = false;
        this.error = true;
        return of(null);
      })
    );
  }

  private maybeStartTour(): void {
    if (this.tourChecked) {
      return;
    }
    this.tourChecked = true;
    // Laisse le tableau se rendre avant de mesurer les zones.
    setTimeout(() => this.tour.startIfFirstVisit(STOCK_TEAM_TOUR), 300);
  }

  private goToMonth(month: MonthRef): void {
    const current = compareMonths(month, currentMonth()) === 0;
    this.navigate({ year: current ? null : month.year, month: current ? null : month.month });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
