import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, Subject, BehaviorSubject } from 'rxjs';
import { switchMap, take, tap, map, filter, takeUntil } from 'rxjs/operators';
import { Commercial } from '../../models/commercial.model';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { selectCommercialByUsername } from '../../store/commercial/commercial.selectors';
import { selectIsOnline } from '../../store/health-check/health-check.selectors';
import * as CommercialActions from '../../store/commercial/commercial.actions';
import * as StockOutputActions from '../../store/stock-output/stock-output.actions';
import * as DistributionActions from '../../store/distribution/distribution.actions';
import * as RecoveryActions from '../../store/recovery/recovery.actions';
import * as TontineActions from '../../store/tontine/tontine.actions';
import * as CommercialStockActions from '../../store/commercial-stock/commercial-stock.actions';
import { selectSyncErrorsCount, selectAutomaticSyncIsActive } from '../../store/sync/sync.selectors';
import { selectAllDistributions, selectDistributionsByCommercialUsername } from '../../store/distribution/distribution.selectors';
import { selectAllRecoveries, selectRecoveryViewsByCommercialUsername } from '../../store/recovery/recovery.selectors';
import { selectAllStockOutputs, selectStockOutputsByCommercialUsername } from '../../store/stock-output/stock-output.selectors';
import { selectTontineCollections } from '../../store/tontine/tontine.selectors';
import { selectAllCommercialStockItems } from '../../store/commercial-stock/commercial-stock.selectors';
import { Distribution } from '../../models/distribution.model';
import { Recovery } from '../../models/recovery.model';
import { RecoveryView } from '../../models/recovery-view.model';
import { StockOutput } from '../../models/stock-output.model';
import { CommercialStockItem } from '../../models/commercial-stock-item.model';
import { LoggerService } from '../../core/services/logger.service';
import { Article } from '../../models/article.model';
import { selectAllArticles } from '../../store/article/article.selectors';

Chart.register(...registerables);

interface DashboardViewModel {
  commercial: Commercial | null;
  isOnline: boolean;
  isSyncing: boolean;
  syncNotifications: number;
  salesAmount: number;
  recoveryAmount: number;
  stockOutputAmount: number;
  remainingAmount: number;
  undistributedAmount: number;
  tontineAmount: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendsChart', { static: false }) trendsChartRef!: ElementRef<HTMLCanvasElement>;

  vm$!: Observable<DashboardViewModel>;
  vm: DashboardViewModel = {
    commercial: null,
    isOnline: false,
    isSyncing: false,
    syncNotifications: 0,
    salesAmount: 0,
    recoveryAmount: 0,
    stockOutputAmount: 0,
    remainingAmount: 0,
    undistributedAmount: 0,
    tontineAmount: 0
  };
  chartData$!: Observable<any>;
  activePeriod: string = 'month';

  private periodFilter$ = new BehaviorSubject<string>('month');
  private destroy$ = new Subject<void>();
  private trendsChart: Chart | null = null;

  constructor(
    private router: Router,
    private store: Store,
    private log: LoggerService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.log.log('[DashboardPage] User entered dashboard.');
    this.loadDashboardData();
    this.setupViewModel();
  }

  ionViewWillEnter() {
    // Recharger les données à chaque fois qu'on entre dans la vue
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user)
    ).subscribe(user => {
      const username = user!.username;
      this.store.dispatch(CommercialActions.loadCommercial({ commercialUsername: username }));
      // this.store.dispatch(StockOutputActions.loadStockOutputs({ commercialUsername: username })); // Deprecated
      this.store.dispatch(CommercialStockActions.loadCommercialStock({ commercialUsername: username }));
      this.store.dispatch(DistributionActions.loadDistributions({ commercialUsername: username }));
      // Recharger aussi les recouvrements pour les KPIs
      this.store.dispatch(RecoveryActions.loadRecoveries({ commercialUsername: username }));
      // Charger les collections tontine
      this.store.dispatch(TontineActions.loadTontineCollections());
    });
  }

  ngAfterViewInit() {
    this.initializeChart();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.trendsChart) {
      this.trendsChart.destroy();
      this.trendsChart = null;
    }
  }

  private setupViewModel() {
    const commercial$ = this.store.select(selectAuthUser).pipe(
      switchMap(user => this.store.select(selectCommercialByUsername(user?.username || '')))
    );
    const distributions$ = this.store.select(selectAuthUser).pipe(
      filter(user => !!user),
      switchMap(user => this.store.select(selectDistributionsByCommercialUsername(user!.username)))
    );
    const recoveries$ = this.store.select(selectAuthUser).pipe(
      filter(user => !!user),
      switchMap(user => this.store.select(selectRecoveryViewsByCommercialUsername(user!.username)))
    );
    // const stockOutputs$ = this.store.select(selectAuthUser).pipe(
    //   filter(user => !!user),
    //   switchMap(user => this.store.select(selectStockOutputsByCommercialUsername(user!.username)))
    // );
    const commercialStockItems$ = this.store.select(selectAllCommercialStockItems);
    const articles$ = this.store.select(selectAllArticles);

    const tontineCollections$ = this.store.select(selectTontineCollections);

    const filteredData$ = this.periodFilter$.pipe(map(period => this.getStartDate(period)));

    // Create salesAmount observable first so it can be reused
    const salesAmount$ = combineLatest([distributions$, filteredData$]).pipe(
        map(([d, sd]) => (d as Distribution[]).filter(i => new Date(i.createdAt) >= sd).reduce((s: number, i: Distribution) => s + i.totalAmount, 0))
    );

    this.vm$ = combineLatest({
      commercial: commercial$,
      isOnline: this.store.select(selectIsOnline),
      isSyncing: this.store.select(selectAutomaticSyncIsActive),
      syncNotifications: this.store.select(selectSyncErrorsCount),
      salesAmount: salesAmount$,
      recoveryAmount: combineLatest([recoveries$, filteredData$]).pipe(map(([r, sd]) => (r as RecoveryView[]).filter(i => new Date(i.paymentDate) >= sd).reduce((s: number, i: RecoveryView) => s + i.amount, 0))),
      // stockOutputAmount: combineLatest([stockOutputs$, this.periodFilter$]).pipe(map(([so, p]) => this.calculateStockOutputAmount(so as StockOutput[], p))),
      stockOutputAmount: combineLatest([commercialStockItems$, articles$, salesAmount$]).pipe(map(([items, articles, sales]) => this.calculateTotalStockValue(items, articles, sales))),
      remainingAmount: combineLatest([distributions$, recoveries$, this.periodFilter$]).pipe(map(([d, r, p]) => this.calculateRemainingAmount(d as Distribution[], r as RecoveryView[], p))),
      // undistributedAmount: combineLatest([stockOutputs$, distributions$, filteredData$]).pipe(map(([so, d, sd]) => this.calculateUndistributedAmount(so as StockOutput[], d as Distribution[], sd))),
      undistributedAmount: combineLatest([commercialStockItems$, articles$]).pipe(map(([items, articles]) => this.calculateUndistributedStockValue(items, articles))),
      tontineAmount: combineLatest([tontineCollections$, filteredData$]).pipe(map(([tc, sd]) => this.calculateTontineAmount(tc, sd)))
    });

    this.chartData$ = combineLatest([distributions$, recoveries$, this.periodFilter$]).pipe(
      map(([distributions, recoveries, period]) => this.prepareChartData(distributions, recoveries, period ?? 'month'))
    );

    // Subscribe to update the synchronous property for better performance
    this.vm$.pipe(takeUntil(this.destroy$)).subscribe(vm => {
      this.vm = vm;
      this.log.log(`[Dashboard] KPIs updated - Period: ${this.activePeriod}, Sales: ${vm.salesAmount}, Recovery: ${vm.recoveryAmount}, StockOutput: ${vm.stockOutputAmount}, Remaining: ${vm.remainingAmount}, Undistributed: ${vm.undistributedAmount}, Tontine: ${vm.tontineAmount}`);
      this.cdr.markForCheck();
    });

    // Debug log for raw stock items
    commercialStockItems$.pipe(takeUntil(this.destroy$)).subscribe(items => {
        console.log('--- RAW COMMERCIAL STOCK ITEMS FROM STORE ---');
        console.log(JSON.stringify(items, null, 2));
        console.log('---------------------------------------------');
    });
  }

  setPeriod(period: string) {
    this.activePeriod = period;
    this.periodFilter$.next(period);
  }

  private initializeChart() {
    if (!this.trendsChartRef) return;
    const ctx = this.trendsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartData$.pipe(takeUntil(this.destroy$)).subscribe(chartData => {
      if (this.trendsChart) {
        this.trendsChart.data = chartData;
        this.trendsChart.update();
      } else {
        this.trendsChart = new Chart(ctx, this.getChartConfiguration(chartData));
      }
    });
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const weekStartDate = new Date(now.setDate(now.getDate() - now.getDay()));
        return new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate());
      case 'year': return new Date(now.getFullYear(), 0, 1);
      default: return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  // Calculation helpers to keep the stream clean
  private calculateStockOutputAmount(stockOutputs: StockOutput[], period: string): number {
    // DEPRECATED: This logic was based on stock outputs history.
    // The new requirement is to show current stock value based on CommercialStockItems.
    // See calculateTotalStockValue below.
    return 0;
  }

  private calculateTotalStockValue(items: CommercialStockItem[], articles: Article[], salesAmount: number): number {
      if (!items || !articles) return 0;

      // Calculate undistributed value
      const undistributed = this.calculateUndistributedStockValue(items, articles);

      // Total Stock Output = Total Sales (from KPI) + Undistributed
      return salesAmount + undistributed;
  }

  private calculateUndistributedStockValue(items: CommercialStockItem[], articles: Article[]): number {
      if (!items || !articles) return 0;

      return items.reduce((total, item) => {
          const article = articles.find(a => a.id === item.articleId);
          if (article) {
              return total + (item.quantityRemaining * article.creditSalePrice);
          }
          return total;
      }, 0);
  }

  private calculateRemainingAmount(distributions: Distribution[], recoveries: RecoveryView[], period: string): number {
    const now = new Date();

    switch (period) {
      case 'today': {
        // Pour le jour: somme des dailyPayment des distributions en cours - recouvrements du jour (heures de travail)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0); // 7h AM
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0); // 7h PM

        const inProgressDistributions = distributions.filter(d => d.status === 'INPROGRESS');
        const totalDailyPayments = inProgressDistributions.reduce((sum, d) => sum + d.dailyPayment, 0);

        const todayRecoveries = recoveries
          .filter(r => {
            const recoveryDate = new Date(r.paymentDate);
            return recoveryDate >= todayStart && recoveryDate <= todayEnd;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        return Math.max(0, totalDailyPayments - todayRecoveries);
      }

      case 'week': {
        // Pour la semaine: (dailyPayment * 7) des distributions en cours avec endDate >= aujourd'hui - recouvrements des 7 derniers jours
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const activeDistributions = distributions.filter(d =>
          d.status === 'INPROGRESS' && new Date(d.endDate) >= now
        );
        const weeklyExpectedPayments = activeDistributions.reduce((sum, d) => sum + (d.dailyPayment * 7), 0);

        const weekRecoveries = recoveries
          .filter(r => new Date(r.paymentDate) >= weekAgo)
          .reduce((sum, r) => sum + r.amount, 0);

        return Math.max(0, weeklyExpectedPayments - weekRecoveries);
      }

      case 'month':
      case 'year':
      default: {
        // Pour le mois et l'année: logique par défaut (remainingAmount des distributions filtrées par période)
        let startDate: Date;
        if (period === 'year') {
          startDate = new Date(now.getFullYear(), 0, 1);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return distributions
          .filter(d => new Date(d.createdAt) >= startDate)
          .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
      }
    }
  }

  private calculateUndistributedAmount(stockOutputs: StockOutput[], distributions: Distribution[], startDate: Date): number {
    // DEPRECATED
    return 0;
  }

  private calculateTontineAmount(collections: any[], startDate: Date): number {
    console.log('=== TONTINE KPI CALCULATION ===');
    console.log('Collections received:', collections);
    console.log('Collections count:', collections?.length || 0);
    console.log('Start date for filter:', startDate);

    if (!collections) {
      console.log('No collections - returning 0');
      return 0;
    }

    const filtered = collections.filter(c => {
      const collectionDate = new Date(c.collectionDate);
      const isAfterStart = collectionDate >= startDate;
      console.log(`Collection ${c.id}: date=${c.collectionDate}, amount=${c.amount}, isAfterStart=${isAfterStart}`);
      return isAfterStart;
    });

    console.log('Filtered collections count:', filtered.length);

    const total = filtered.reduce((sum, c) => sum + c.amount, 0);
    console.log('Total Tontine amount:', total);
    console.log('=== END TONTINE KPI CALCULATION ===');

    return total;
  }

  private prepareChartData(distributions: Distribution[], recoveries: RecoveryView[], period: string): any {
    const now = new Date();
    let labels: string[] = [];
    let salesData: number[] = [];
    let recoveryData: number[] = [];

    if (period === 'today') {
      labels = ['7-9h', '9-11h', '11-13h', '13-15h', '15-17h', '17-19h'];
      salesData = new Array(6).fill(0);
      recoveryData = new Array(6).fill(0);
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0); // Start at 7 AM

      distributions.filter(d => new Date(d.createdAt) >= dayStart).forEach(d => {
        const hour = new Date(d.createdAt).getHours();
        if (hour >= 7 && hour < 19) {
          const index = Math.floor((hour - 7) / 2);
          salesData[index] += d.totalAmount;
        }
      });

      recoveries.filter(r => new Date(r.paymentDate) >= dayStart).forEach(r => {
        const hour = new Date(r.paymentDate).getHours();
        if (hour >= 7 && hour < 19) {
          const index = Math.floor((hour - 7) / 2);
          recoveryData[index] += r.amount;
        }
      });
    } else {
      let daysToAnalyze = 30;
      if (period === 'week') daysToAnalyze = 7;
      if (period === 'year') daysToAnalyze = 365;

      for (let i = 0; i < daysToAnalyze; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const dailySales = distributions
          .filter(d => {
            const dDate = new Date(d.createdAt);
            return dDate >= dayStart && dDate < dayEnd;
          })
          .reduce((sum, d) => sum + d.totalAmount, 0);

        const dailyRecoveries = recoveries
          .filter(r => {
            const rDate = new Date(r.paymentDate);
            return rDate >= dayStart && rDate < dayEnd;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        labels.unshift(date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }));
        salesData.unshift(dailySales);
        recoveryData.unshift(dailyRecoveries);
      }
    }

    return {
      labels,
      datasets: [
        {
          label: 'Ventes',
          data: salesData,
          borderColor: '#1976D2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Recouvrements',
          data: recoveryData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }

  private getChartConfiguration(data: any): ChartConfiguration {
    return {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#E0E0E0',
              lineWidth: 1
            },
            ticks: {
              color: '#757575',
              font: {
                size: 10
              },
              callback: function (value) {
                return (value as number / 1000) + 'K F';
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#757575',
              font: {
                size: 10
              }
            }
          }
        },
        elements: {
          point: {
            radius: 4,
            hoverRadius: 6
          },
          line: {
            borderWidth: 2
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };
  }

  // Navigation
  performSync = () => this.router.navigate(['/sync/automatic']);
  showMenu = () => this.router.navigate(['/tabs/more']);
  navigateToDistribution = () => this.router.navigate(['/distributions/new']);
  navigateToRecovery = () => this.router.navigate(['/recovery']);
  navigateToNewClient = () => this.router.navigate(['/tabs/clients/new-client']);
  generateReport = () => this.router.navigate(['/report']);
  navigateToTontineDashboard = () => this.router.navigate(['/tontine/dashboard']);
}
