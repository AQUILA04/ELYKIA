import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, merge, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/client/service/client.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AlertService } from 'src/app/shared/service/alert.service';
import { UserService } from 'src/app/user/service/user.service';
import { DailyOperationLog } from '../../models/daily-operation-log.model';
import { OperationTypeTotal, operationLabel, operationTone } from '../../models/operation-types';
import { ReportFilters, filtersFromParams, filtersToParams } from '../../models/report-period';
import { DailyOperationService } from '../../service/daily-operation.service';
import { GuidedTourService } from '../../components/guided-tour/guided-tour.service';
import { JOURNAL_TOUR } from '../../components/guided-tour/report-tours';
import { AgentOption } from '../../components/report-filter-bar/report-filter-bar.component';

const PAGE_SIZE = 25;

/** Journal des opérations (/report/daily/journal) : totaux par type (cliquables) et liste paginée. */
@Component({
    selector: 'app-report-journal',
    templateUrl: './report-journal.component.html',
    styleUrls: ['./report-journal.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ReportJournalComponent implements OnInit, OnDestroy {
    filters!: ReportFilters;
    type: string | null = null;
    page = 0;
    totalElements = 0;
    operations: DailyOperationLog[] = [];
    totals: OperationTypeTotal[] = [];
    loading = true;
    error = false;
    exporting = false;
    agents: AgentOption[] = [];
    isPromoter = false;

    readonly pageSize = PAGE_SIZE;
    readonly label = operationLabel;
    readonly tone = operationTone;

    private readonly destroy$ = new Subject<void>();
    private readonly reload$ = new Subject<void>();
    private tourChecked = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private operationService: DailyOperationService,
        private clientService: ClientService,
        private userService: UserService,
        private alertService: AlertService,
        private tour: GuidedTourService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
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
                type: params.get('type') || null,
                page: Math.max(0, Number(params.get('page')) || 0)
            })),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
            tap(state => {
                this.filters = state.filters;
                this.type = state.type;
                this.page = state.page;
            })
        );

        merge(query$, this.reload$).pipe(
            switchMap(() => {
                this.loading = true;
                this.error = false;
                this.cdr.markForCheck();
                const { start, end, commercial } = this.filters;
                return forkJoin({
                    page: this.operationService.getOperations(start, end, commercial || undefined, this.page, PAGE_SIZE, this.type),
                    totals: this.operationService.getTotals(start, end, commercial)
                }).pipe(catchError(() => {
                    this.error = true;
                    return of(null);
                }));
            }),
            takeUntil(this.destroy$)
        ).subscribe(result => {
            if (result) {
                this.operations = result.page?.content || [];
                this.totalElements = result.page?.totalElements || 0;
                this.totals = result.totals || [];
            }
            this.loading = false;
            this.cdr.markForCheck();
            if (result && !this.tourChecked) {
                this.tourChecked = true;
                setTimeout(() => this.tour.startIfFirstVisit(JOURNAL_TOUR), 300);
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

    /** Une carte de type sert de filtre ; un second clic l'enlève. */
    toggleType(type: string): void {
        this.navigate({ type: this.type === type ? null : type, page: null });
    }

    goToPage(page: number): void {
        this.navigate({ page: page > 0 ? String(page) : null });
    }

    get pageCount(): number {
        return Math.max(1, Math.ceil(this.totalElements / PAGE_SIZE));
    }

    get operationsCount(): number {
        return this.totals.reduce((sum, total) => sum + (total.count || 0), 0);
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
        this.tour.start(JOURNAL_TOUR);
    }

    exportPdf(): void {
        if (this.exporting) {
            return;
        }
        this.exporting = true;
        const { start, end, commercial } = this.filters;
        this.operationService.exportPdf(start, end, commercial || undefined, this.type).subscribe({
            next: blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `journal_operations_${start}_${end}.pdf`;
                link.click();
                URL.revokeObjectURL(url);
                this.exporting = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.exporting = false;
                this.alertService.showError('Le PDF du journal n\'a pas pu être généré.');
                this.cdr.markForCheck();
            }
        });
    }

    trackByOperation(_: number, op: DailyOperationLog): number {
        return op.id;
    }

    trackByType(_: number, total: OperationTypeTotal): string {
        return total.type;
    }
}
