import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/service/auth.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import {
  ChartTrendPoint,
  DashboardV2Data,
  DashboardV2Period,
  DashboardV2Service
} from './dashboard-v2.service';
import { DashboardKpiCardData } from './components/dashboard-kpi-card/dashboard-kpi-card.component';
import { formatFcfa } from './utils/operation-message.util';

@Component({
  selector: 'app-dashboard-v2',
  templateUrl: './dashboard-v2.component.html',
  styleUrls: ['./dashboard-v2.component.scss']
})
export class DashboardV2Component implements OnInit, OnDestroy {
  currentDate = new Date();
  lastUpdate = new Date();
  loading = true;
  chartLoading = true;
  error: string | null = null;

  isPromoter = false;
  username = '';
  period!: DashboardV2Period;
  monthControl = new FormControl<Date>(new Date());

  data: DashboardV2Data | null = null;
  kpiCards: DashboardKpiCardData[] = [];
  chartPoints: ChartTrendPoint[] = [];
  chartGranularity: 'month' | 'quarter' | 'year' = 'month';

  private subscriptions: Subscription[] = [];
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private dashboardV2Service: DashboardV2Service,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    const currentUser = this.authService.getCurrentUser();
    this.username = currentUser?.username ?? '';

    const now = new Date();
    this.period = this.dashboardV2Service.buildPeriod(now.getFullYear(), now.getMonth() + 1);
    this.monthControl.setValue(new Date(this.period.year, this.period.month - 1, 1));
    this.kpiCards = this.buildPlaceholderKpiCards();

    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);

    const monthSub = this.monthControl.valueChanges.subscribe((value) => {
      if (!value) return;
      this.period = this.dashboardV2Service.buildPeriod(value.getFullYear(), value.getMonth() + 1);
      this.loadDashboard();
      this.loadCharts();
    });
    this.subscriptions.push(monthSub);

    this.loadDashboard();
    this.loadCharts();
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  refresh(): void {
    this.loadDashboard();
    this.loadCharts();
  }

  onChartGranularityChange(granularity: 'month' | 'quarter' | 'year'): void {
    this.chartGranularity = granularity;
    this.loadCharts();
  }

  private loadDashboard(): void {
    this.loading = true;
    this.error = null;
    if (!this.kpiCards.length) {
      this.kpiCards = this.buildPlaceholderKpiCards();
    }
    const collector = this.isPromoter ? this.username : undefined;

    void this.authService.hasPermission(KpiFinancierPermissions.Dashboard).then((allowed) => {
      const sub = this.dashboardV2Service
        .loadDashboard(this.period, collector, this.isPromoter, allowed)
        .subscribe({
          next: (data) => {
            this.data = data;
            this.kpiCards = allowed ? this.buildKpiCards(data) : [];
            this.lastUpdate = new Date();
            this.loading = false;
          },
          error: () => {
            this.error = 'Impossible de charger le tableau de bord.';
            this.loading = false;
          }
        });
      this.subscriptions.push(sub);
    });
  }

  private loadCharts(): void {
    void this.authService.hasPermission(KpiFinancierPermissions.Dashboard).then((allowed) => {
      if (!allowed) {
        this.chartPoints = [];
        this.chartLoading = false;
        return;
      }
      this.chartLoading = true;
      const range = this.getChartRange();
      const sub = this.dashboardV2Service.loadChartTrends(range.startDate, range.endDate).subscribe({
        next: (points) => {
          this.chartPoints = this.applyChartGranularity(points);
          this.chartLoading = false;
        },
        error: () => {
          this.chartPoints = [];
          this.chartLoading = false;
        }
      });
      this.subscriptions.push(sub);
    });
  }

  private getChartRange(): { startDate: string; endDate: string } {
    const end = new Date(this.period.year, this.period.month, 0);
    if (this.chartGranularity === 'month') {
      return { startDate: this.period.startDate, endDate: this.period.endDate };
    }
    if (this.chartGranularity === 'quarter') {
      const quarterStartMonth = Math.floor((this.period.month - 1) / 3) * 3;
      const start = new Date(this.period.year, quarterStartMonth, 1);
      const quarterEnd = new Date(this.period.year, quarterStartMonth + 3, 0);
      return {
        startDate: this.toIsoDate(start),
        endDate: this.toIsoDate(quarterEnd)
      };
    }
    const start = new Date(this.period.year, 0, 1);
    const yearEnd = new Date(this.period.year, 11, 31);
    return { startDate: this.toIsoDate(start), endDate: this.toIsoDate(yearEnd) };
  }

  private applyChartGranularity(points: ChartTrendPoint[]): ChartTrendPoint[] {
    if (this.chartGranularity === 'month') {
      return points;
    }
    const bucket = new Map<string, ChartTrendPoint>();
    for (const point of points) {
      const date = this.parseTrendDate(point.label);
      let key: string;
      if (this.chartGranularity === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `T${quarter} ${date.getFullYear()}`;
      } else {
        key = String(date.getFullYear());
      }
      const existing = bucket.get(key) ?? { label: key, sales: 0, collections: 0 };
      existing.sales += point.sales;
      existing.collections += point.collections;
      bucket.set(key, existing);
    }
    return Array.from(bucket.values());
  }

  private parseTrendDate(label: string): Date {
    const currentYear = this.period.year;
    const parsed = new Date(`${label} ${currentYear}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    return new Date(label);
  }

  private buildPlaceholderKpiCards(): DashboardKpiCardData[] {
    return [
      { icon: 'credit_card', iconClass: 'icon-navy', title: 'Crédits en cours', value: '—' },
      { icon: 'payments', iconClass: 'icon-cyan', title: 'Recouvrement encours', value: '—' },
      { icon: 'savings', iconClass: 'icon-green', title: 'Tontine', value: '—' },
      { icon: 'groups', iconClass: 'icon-orange', title: 'Clients', value: '—' },
      { icon: 'inventory_2', iconClass: 'icon-purple', title: 'Stock', value: '—' }
    ];
  }

  private buildKpiCards(data: DashboardV2Data): DashboardKpiCardData[] {
    const credit = data.credit;
    const marginSubtitle = this.isPromoter
      ? `${credit.count} crédit(s) en cours`
      : `${credit.count} crédit(s) · marge ${formatFcfa(credit.totalMargin)} FCFA`;

    return [
      {
        icon: 'credit_card',
        iconClass: 'icon-navy',
        title: 'Crédits en cours',
        value: `${formatFcfa(credit.totalAmount)} FCFA`,
        subtitle: marginSubtitle
      },
      {
        icon: 'payments',
        iconClass: 'icon-cyan',
        title: 'Recouvrement encours',
        value: `${formatFcfa(credit.recoveredAmount)} FCFA`,
        subtitle: `Recouvré · Restant ${formatFcfa(credit.remainingAmount)} FCFA`
      },
      {
        icon: 'savings',
        iconClass: 'icon-green',
        title: 'Tontine',
        value: `${formatFcfa(data.tontine.totalMontant)} FCFA`,
        subtitle: `${data.tontine.totalMises} mise(s) · part société ${formatFcfa(data.tontine.totalSocietyShare)} FCFA`
      },
      {
        icon: 'groups',
        iconClass: 'icon-orange',
        title: 'Clients',
        value: `${data.clients.totalRegistered}`,
        subtitle: `${data.clients.totalRegistered} actifs · ${data.clients.withActiveCredit} avec crédit`
      },
      {
        icon: 'inventory_2',
        iconClass: 'icon-purple',
        title: data.stock.label,
        value: `${formatFcfa(data.stock.valuation)} FCFA`,
        subtitle: `${data.stock.count} ${data.stock.countLabel}${data.stock.emptyMessage ? ' · ' + data.stock.emptyMessage : ''}`
      }
    ];
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
