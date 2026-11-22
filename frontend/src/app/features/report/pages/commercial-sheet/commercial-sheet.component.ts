import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject, combineLatest, merge, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ClientService } from '@features/client/service/client.service';
import { UserProfile } from '@shared/models/user-profile.enum';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { AlertService } from '@shared/service/alert.service';
import { UserService } from '@features/user/service/user.service';
import { CommercialReportSummary, STATUS_LABELS, ReconciliationStatus } from '../../models/commercial-cockpit.model';
import { ReportFilters, classicParams, filtersFromParams, filtersToParams, isSingleDay } from '../../models/report-period';
import { CommercialCockpitService } from '../../service/commercial-cockpit.service';
import { DailyReportService } from '../../service/daily-report.service';
import { GuidedTourService } from '@shared/report-ui/guided-tour/guided-tour.service';
import { SHEET_TOUR } from '../../report-tours';
import { AgentOption } from '../../components/report-filter-bar/report-filter-bar.component';
import { CashDepositModalComponent } from '../../components/cash-deposit-modal/cash-deposit-modal.component';
import { SurplusReallocationDialogComponent } from '../../components/surplus-reallocation-dialog/surplus-reallocation-dialog.component';

interface TrendBar {
    label: string;
    dueHeight: number;
    paidHeight: number;
    due: number;
    paid: number;
    late: boolean;
}

/** Fiche d'un commercial (/report/daily/commercials/:username). */
@Component({
    selector: 'app-commercial-sheet',
    templateUrl: './commercial-sheet.component.html',
    styleUrls: ['./commercial-sheet.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class CommercialSheetComponent implements OnInit, OnDestroy {
    username = '';
    filters!: ReportFilters;
    summary: CommercialReportSummary | null = null;
    trend: TrendBar[] = [];
    loading = true;
    error = false;
    agents: AgentOption[] = [];
    isPromoter = false;
    canDeposit = false;
    canRebalance = false;
    downloading = false;

    readonly statusLabels = STATUS_LABELS;
    readonly year = new Date().getFullYear();

    private readonly destroy$ = new Subject<void>();
    private readonly refresh$ = new Subject<void>();
    private tourChecked = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private cockpitService: CommercialCockpitService,
        private dailyReportService: DailyReportService,
        private clientService: ClientService,
        private userService: UserService,
        private tokenStorage: TokenStorageService,
        private alertService: AlertService,
        private dialog: MatDialog,
        private tour: GuidedTourService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
        const isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
        const isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
        const isAdmin = this.userService.hasProfile(UserProfile.ADMIN)
            || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
        this.canDeposit = isManager || isSecretary;
        this.canRebalance = isManager || isSecretary || isAdmin;

        if (!this.isPromoter) {
            this.clientService.getAgents().pipe(takeUntil(this.destroy$)).subscribe({
                next: (agents) => {
                    this.agents = [...(agents || [])].sort((a, b) => a.username.localeCompare(b.username));
                    this.cdr.markForCheck();
                },
                error: () => { /* navigation ‹ › indisponible */ }
            });
        }

        const target$ = combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
            map(([params, query]) => ({ username: this.resolveUsername(params.get('username')), filters: filtersFromParams(query) })),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
            tap(target => {
                this.username = target.username;
                this.filters = target.filters;
            })
        );

        merge(target$, this.refresh$.pipe(map(() => ({ username: this.username, filters: this.filters })))).pipe(
            switchMap(target => {
                this.loading = true;
                this.error = false;
                this.cdr.markForCheck();
                return this.cockpitService.getCommercialSummary(target.username, target.filters.start, target.filters.end)
                    .pipe(catchError(() => {
                        this.error = true;
                        return of(null);
                    }));
            }),
            takeUntil(this.destroy$)
        ).subscribe(summary => {
            this.summary = summary;
            this.trend = this.buildTrend(summary);
            this.loading = false;
            this.cdr.markForCheck();
            if (summary && !this.tourChecked) {
                this.tourChecked = true;
                setTimeout(() => this.tour.startIfFirstVisit(SHEET_TOUR), 300);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /** Un commercial ne voit que sa fiche. */
    private resolveUsername(requested: string | null): string {
        if (this.isPromoter) {
            return this.tokenStorage.getUser()?.username || requested || '';
        }
        return requested || '';
    }

    refresh(): void {
        this.refresh$.next();
    }

    startTour(): void {
        this.tour.start(SHEET_TOUR);
    }

    onFiltersChange(filters: ReportFilters): void {
        if (filters.commercial && filters.commercial !== this.username) {
            void this.router.navigate(['/report/daily/commercials', filters.commercial], {
                queryParams: filtersToParams({ ...filters, commercial: null })
            });
            return;
        }
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: filtersToParams({ ...filters, commercial: null })
        });
    }

    get carryParams(): Record<string, string | null> {
        return filtersToParams({ ...this.filters, commercial: null });
    }

    get sheetFilters(): ReportFilters {
        return { ...this.filters, commercial: this.username };
    }

    get classicQueryParams(): Record<string, string> {
        return classicParams({ ...this.filters, commercial: this.username });
    }

    get previousAgent(): string | null {
        return this.neighbour(-1);
    }

    get nextAgent(): string | null {
        return this.neighbour(1);
    }

    private neighbour(step: number): string | null {
        if (this.agents.length < 2) {
            return null;
        }
        const index = this.agents.findIndex(agent => agent.username === this.username);
        if (index < 0) {
            return null;
        }
        return this.agents[(index + step + this.agents.length) % this.agents.length].username;
    }

    get initials(): string {
        const digits = this.username.replace(/\D/g, '');
        return digits ? digits.slice(-2) : this.username.slice(0, 2).toUpperCase();
    }

    pillClass(status: ReconciliationStatus | undefined): string {
        switch (status) {
            case 'LATE': return 'pill-late';
            case 'SURPLUS': return 'pill-surplus';
            case 'UP_TO_DATE': return 'pill-ok';
            default: return 'pill-idle';
        }
    }

    get showDepositButton(): boolean {
        return this.canDeposit && !!this.summary && isSingleDay(this.filters) && this.summary.line.remaining > 0.01;
    }

    get showRebalanceButton(): boolean {
        const line = this.summary?.line;
        return this.canRebalance && !!line && line.surplus > 0.01
            && (line.remaining > 0.01 || line.historicalRemaining > 0.01);
    }

    openDeposit(): void {
        const line = this.summary?.line;
        if (!line) {
            return;
        }
        const dialogRef = this.dialog.open(CashDepositModalComponent, {
            width: '920px',
            maxWidth: '96vw',
            panelClass: 'cash-deposit-dialog-panel',
            data: {
                commercialUsername: this.username,
                remainingAmount: line.remaining,
                remainingCredit: line.remainingCredit,
                remainingTontine: line.remainingTontine,
                remainingNewBalance: line.remainingNewBalance,
                date: this.filters.end
            },
            disableClose: true
        });
        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(done => {
            if (done) {
                this.refresh();
            }
        });
    }

    openRebalance(): void {
        const dialogRef = this.dialog.open(SurplusReallocationDialogComponent, {
            width: '980px',
            maxWidth: '96vw',
            panelClass: 'surplus-reallocation-dialog-panel',
            data: { commercialUsername: this.username, startDate: this.filters.start, endDate: this.filters.end }
        });
        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
            if (!result) {
                return;
            }
            const amount = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(result.totalReallocated || 0);
            this.alertService.showSuccess(`Surplus équilibré : ${amount} FCFA réaffectés.`);
            this.refresh();
        });
    }

    downloadPdf(): void {
        if (this.downloading) {
            return;
        }
        this.downloading = true;
        this.dailyReportService.exportPdf(this.filters.start, this.filters.end, this.username).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `rapport_${this.username}_${this.filters.start}_${this.filters.end}.pdf`;
                link.click();
                URL.revokeObjectURL(url);
                this.downloading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.downloading = false;
                this.alertService.showError('Le PDF n\'a pas pu être généré.');
                this.cdr.markForCheck();
            }
        });
    }

    private buildTrend(summary: CommercialReportSummary | null): TrendBar[] {
        const series = summary?.series || [];
        const max = Math.max(1, ...series.map(point => Math.max(point.amountToDeposit, point.deposited)));
        const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit' });
        return series.map(point => {
            const [y, m, d] = point.date.split('-').map(Number);
            return {
                label: formatter.format(new Date(y, m - 1, d)),
                due: point.amountToDeposit,
                paid: point.deposited,
                dueHeight: Math.round((point.amountToDeposit / max) * 100),
                paidHeight: Math.round((point.deposited / max) * 100),
                late: point.deposited + 0.01 < point.amountToDeposit
            };
        });
    }
}
