import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject, forkJoin, merge, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/client/service/client.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AlertService } from 'src/app/shared/service/alert.service';
import { UserService } from 'src/app/user/service/user.service';
import {
    CashDepositRow,
    CashDepositTotals,
    canCancelDeposit,
    depositCatchup,
    depositTontine,
    depositTotal,
    showCaptureHint,
    visibleDeposits
} from '../../models/deposit-display';
import { ReportFilters, filtersFromParams, filtersToParams } from '../../models/report-period';
import { CashDepositService } from '../../service/cash-deposit.service';
import { GuidedTourService } from '../../../shared/report-ui/guided-tour/guided-tour.service';
import { DEPOSITS_TOUR } from '../../report-tours';
import { AgentOption } from '../../components/report-filter-bar/report-filter-bar.component';
import { SurplusReallocationDialogComponent } from '../../components/surplus-reallocation-dialog/surplus-reallocation-dialog.component';

const PAGE_SIZE = 20;

/** Versements et rapprochement (/report/daily/deposits) : dépôts ventilés par compte, surplus, remise. */
@Component({
    selector: 'app-report-deposits',
    templateUrl: './report-deposits.component.html',
    styleUrls: ['./report-deposits.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ReportDepositsComponent implements OnInit, OnDestroy {
    filters!: ReportFilters;
    surplusOnly = false;
    view: 'deposits' | 'remittance' = 'deposits';
    page = 0;
    totalElements = 0;
    rows: CashDepositRow[] = [];
    pageRows: CashDepositRow[] = [];
    totals: CashDepositTotals | null = null;
    loading = true;
    error = false;
    agents: AgentOption[] = [];
    isPromoter = false;
    isManager = false;
    isAdmin = false;
    canRemit = false;
    canRebalance = false;

    readonly pageSize = PAGE_SIZE;
    readonly depositTotal = depositTotal;
    readonly depositTontine = depositTontine;
    readonly depositCatchup = depositCatchup;
    readonly showCaptureHint = showCaptureHint;

    private readonly destroy$ = new Subject<void>();
    private readonly reload$ = new Subject<void>();
    private tourChecked = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private cashDepositService: CashDepositService,
        private clientService: ClientService,
        private userService: UserService,
        private alertService: AlertService,
        private dialog: MatDialog,
        private tour: GuidedTourService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
        this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
        const isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
        this.isAdmin = this.userService.hasProfile(UserProfile.ADMIN) || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
        this.canRemit = this.isManager || isSecretary;
        this.canRebalance = this.isManager || isSecretary || this.isAdmin;

        if (!this.isPromoter) {
            this.clientService.getAgents().pipe(takeUntil(this.destroy$)).subscribe({
                next: agents => {
                    this.agents = agents || [];
                    this.cdr.markForCheck();
                },
                error: () => { /* filtre commercial vide */ }
            });
        }

        const query$ = this.route.queryParamMap.pipe(
            map(params => ({
                filters: filtersFromParams(params),
                surplusOnly: params.get('surplus') === '1',
                view: (params.get('view') === 'remittance' && this.canRemit ? 'remittance' : 'deposits') as 'deposits' | 'remittance',
                page: Math.max(0, Number(params.get('page')) || 0)
            })),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
            tap(state => {
                this.filters = state.filters;
                this.surplusOnly = state.surplusOnly;
                this.view = state.view;
                this.page = state.page;
            })
        );

        merge(query$, this.reload$).pipe(
            switchMap(() => {
                if (this.view === 'remittance') {
                    this.loading = false;
                    this.cdr.markForCheck();
                    return of(null);
                }
                this.loading = true;
                this.error = false;
                this.cdr.markForCheck();
                const { start, end, commercial } = this.filters;
                return forkJoin({
                    page: this.cashDepositService.getDeposits(start, end, commercial || undefined, this.page, PAGE_SIZE, this.surplusOnly),
                    totals: this.cashDepositService.getTotals(start, end, commercial)
                }).pipe(catchError(() => {
                    this.error = true;
                    return of(null);
                }));
            }),
            takeUntil(this.destroy$)
        ).subscribe(result => {
            if (result) {
                this.rows = result.page?.content || [];
                this.totalElements = result.page?.totalElements || 0;
                this.pageRows = visibleDeposits(this.rows, this.filters.start, this.filters.end);
                this.totals = result.totals;
            }
            this.loading = false;
            this.cdr.markForCheck();
            if (result && !this.tourChecked) {
                this.tourChecked = true;
                setTimeout(() => this.tour.startIfFirstVisit(DEPOSITS_TOUR), 300);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private navigate(params: Record<string, string | null>): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
    }

    onFiltersChange(filters: ReportFilters): void {
        this.navigate({ ...filtersToParams(filters), page: null });
    }

    setSurplusOnly(value: boolean): void {
        this.navigate({ surplus: value ? '1' : null, page: null });
    }

    setView(view: 'deposits' | 'remittance'): void {
        this.navigate({ view: view === 'remittance' ? 'remittance' : null });
    }

    goToPage(page: number): void {
        this.navigate({ page: page > 0 ? String(page) : null });
    }

    get pageCount(): number {
        return Math.max(1, Math.ceil(this.totalElements / PAGE_SIZE));
    }

    get carryParams(): Record<string, string | null> {
        return filtersToParams(this.filters);
    }

    get sheetParams(): Record<string, string | null> {
        return filtersToParams({ ...this.filters, commercial: null });
    }

    refresh(): void {
        this.reload$.next();
    }

    startTour(): void {
        this.tour.start(DEPOSITS_TOUR);
    }

    canCancel(dep: CashDepositRow): boolean {
        return canCancelDeposit(dep, this.rows, { isManager: this.isManager, isAdmin: this.isAdmin });
    }

    cancel(dep: CashDepositRow): void {
        void this.alertService.showConfirmation(
            'Annulation', 'Êtes-vous sûr de vouloir annuler ce versement ?', 'Oui, annuler'
        ).then(confirmed => {
            if (!confirmed) {
                return;
            }
            this.cashDepositService.cancelDeposit(dep.id).subscribe({
                next: () => {
                    this.alertService.showSuccess('Versement annulé avec succès.');
                    this.refresh();
                },
                error: err => this.alertService.showError(err?.error?.message || 'Erreur lors de l\'annulation du versement')
            });
        });
    }

    rebalance(dep: CashDepositRow): void {
        const dialogRef = this.dialog.open(SurplusReallocationDialogComponent, {
            width: '980px',
            maxWidth: '96vw',
            panelClass: 'surplus-reallocation-dialog-panel',
            data: { commercialUsername: dep.commercialUsername, startDate: this.filters.start, endDate: this.filters.end }
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

    trackById(_: number, dep: CashDepositRow): number {
        return dep.id;
    }
}
