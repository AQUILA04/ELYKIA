import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, merge, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ClientService } from 'src/app/client/service/client.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import {
    ALERT_LABELS,
    CockpitAlert,
    CommercialCockpit,
    CommercialReconciliationLine,
    ReconciliationStatus,
    STATUS_LABELS,
    countByStatus,
    encashmentShares,
    variationPercent
} from '../../models/commercial-cockpit.model';
import {
    PRESET_COMPARE_LABELS,
    ReportFilters,
    classicParams,
    filtersFromParams,
    filtersToParams
} from '../../models/report-period';
import { CommercialCockpitService } from '../../service/commercial-cockpit.service';
import { GuidedTourService } from '../../components/guided-tour/guided-tour.service';
import { COCKPIT_TOUR } from '../../components/guided-tour/report-tours';
import { AgentOption } from '../../components/report-filter-bar/report-filter-bar.component';

/**
 * Cockpit équipe du rapport commerciaux (/report/daily).
 * Un seul appel serveur par changement de filtre ; le portefeuille annuel se charge à la demande.
 */
@Component({
    selector: 'app-report-cockpit',
    templateUrl: './report-cockpit.component.html',
    styleUrls: ['./report-cockpit.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ReportCockpitComponent implements OnInit, OnDestroy {
    filters!: ReportFilters;
    cockpit: CommercialCockpit | null = null;
    loading = true;
    error = false;
    agents: AgentOption[] = [];
    currentDate = new Date();
    lastUpdate: Date | null = null;
    canSeeRecovery = false;

    readonly statusLabels = STATUS_LABELS;
    readonly alertLabels = ALERT_LABELS;
    readonly year = new Date().getFullYear();

    private readonly destroy$ = new Subject<void>();
    private readonly refresh$ = new Subject<void>();
    private clock: ReturnType<typeof setInterval> | null = null;
    private tourChecked = false;
    private forceTour = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private cockpitService: CommercialCockpitService,
        private clientService: ClientService,
        private userService: UserService,
        private tokenStorage: TokenStorageService,
        private tour: GuidedTourService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const roles: string[] = this.tokenStorage.getUser()?.roles || [];
        const isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
        if (isPromoter) {
            // Un commercial n'a qu'une ligne : sa fiche.
            const username = this.tokenStorage.getUser()?.username;
            void this.router.navigate(['/report/daily/commercials', username], {
                queryParamsHandling: 'preserve', replaceUrl: true
            });
            return;
        }
        if (!roles.includes(KpiFinancierPermissions.RapportJournalier)) {
            // Sans KPI financiers (chef de recouvrement…) : l'onglet recouvrement de la présentation classique.
            void this.router.navigate(['/report/daily/classic'], { replaceUrl: true });
            return;
        }
        this.canSeeRecovery = this.userService.hasProfile(UserProfile.RECOVERY_MANAGER)
            || this.userService.hasProfile(UserProfile.GESTIONNAIRE);
        this.forceTour = this.route.snapshot.queryParamMap.get('tour') === '1';

        this.clientService.getAgents().pipe(takeUntil(this.destroy$)).subscribe({
            next: (agents) => {
                this.agents = agents || [];
                this.cdr.markForCheck();
            },
            error: () => { /* la liste reste vide : le filtre commercial est simplement inutilisable */ }
        });

        this.clock = setInterval(() => {
            this.currentDate = new Date();
            this.cdr.markForCheck();
        }, 1000);

        const filters$ = this.route.queryParamMap.pipe(
            map(params => filtersFromParams(params)),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        );

        // Un changement de filtre ou « Actualiser » relance le chargement ; switchMap annule la requête précédente.
        merge(
            filters$.pipe(tap(filters => { this.filters = filters; })),
            this.refresh$.pipe(map(() => this.filters))
        ).pipe(
            switchMap(filters => {
                this.loading = true;
                this.error = false;
                this.cdr.markForCheck();
                return this.cockpitService.getCockpit(filters.start, filters.end, filters.commercial).pipe(
                    catchError(() => {
                        this.error = true;
                        return of(null);
                    })
                );
            }),
            takeUntil(this.destroy$)
        ).subscribe(cockpit => this.onLoaded(cockpit));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.clock) {
            clearInterval(this.clock);
        }
    }

    private onLoaded(cockpit: CommercialCockpit | null): void {
        this.cockpit = cockpit;
        this.loading = false;
        this.lastUpdate = new Date();
        this.cdr.markForCheck();
        if (cockpit && !this.tourChecked) {
            this.tourChecked = true;
            // Laisse le DOM se peindre avant de viser les zones de la visite.
            setTimeout(() => {
                if (this.forceTour) {
                    this.tour.start(COCKPIT_TOUR);
                } else {
                    this.tour.startIfFirstVisit(COCKPIT_TOUR);
                }
            }, 300);
        }
    }

    refresh(): void {
        this.refresh$.next();
    }

    startTour(): void {
        this.tour.start(COCKPIT_TOUR);
    }

    onFiltersChange(filters: ReportFilters): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { ...filtersToParams(filters), tour: null },
            queryParamsHandling: 'merge'
        });
    }

    get compareLabel(): string {
        return PRESET_COMPARE_LABELS[this.filters?.preset ?? 'today'];
    }

    get classicQueryParams(): Record<string, string> {
        return classicParams(this.filters);
    }

    /** Paramètres conservés en passant à une fiche ou à un autre écran. */
    get carryParams(): Record<string, string | null> {
        return filtersToParams({ ...this.filters, commercial: null });
    }

    /** Paramètres de période et de commercial, pour Versements et Journal. */
    get filtersParams(): Record<string, string | null> {
        return filtersToParams(this.filters);
    }

    /** Un surplus se traite dans Versements ; les autres écarts dans la fiche du commercial. */
    alertLink(alert: CockpitAlert): string[] {
        return alert.type === 'SURPLUS'
            ? ['/report/daily/deposits']
            : ['/report/daily/commercials', alert.commercialUsername];
    }

    alertParams(alert: CockpitAlert): Record<string, string | null> {
        return alert.type === 'SURPLUS'
            ? { ...filtersToParams({ ...this.filters, commercial: alert.commercialUsername }), surplus: '1' }
            : this.carryParams;
    }

    variation(current: number, previous: number | undefined | null): number | null {
        return variationPercent(current, previous);
    }

    get statusCounts(): Record<ReconciliationStatus, number> {
        return countByStatus(this.cockpit?.lines || []);
    }

    get shares(): { credit: number; tontine: number; newBalance: number; catchup: number } {
        return this.cockpit ? encashmentShares(this.cockpit.totals) : { credit: 0, tontine: 0, newBalance: 0, catchup: 0 };
    }

    get depositRatePercent(): number {
        return Math.round((this.cockpit?.totals.depositRate ?? 1) * 1000) / 10;
    }

    /** Écart affiché : versé en trop (+) ou manquant (−). */
    gap(line: CommercialReconciliationLine): number {
        return line.remaining > 0.01 ? -line.remaining : line.surplus;
    }

    pillClass(status: ReconciliationStatus): string {
        switch (status) {
            case 'LATE': return 'pill-late';
            case 'SURPLUS': return 'pill-surplus';
            case 'UP_TO_DATE': return 'pill-ok';
            default: return 'pill-idle';
        }
    }

    alertClass(alert: CockpitAlert): string {
        switch (alert.type) {
            case 'SURPLUS': return 'alert-surplus';
            case 'HISTORICAL_REMAINING': return 'alert-history';
            default: return 'alert-late';
        }
    }

    alertDetail(alert: CockpitAlert): string {
        switch (alert.type) {
            case 'REMAINING': return 'Encaissé sur la période, pas encore versé';
            case 'CATCHUP_NOT_DEPOSITED': return 'Cotisations de jours passés saisies, pas encore versées';
            case 'SURPLUS': return alert.canRebalance
                ? 'Versé en trop : peut couvrir un manquant'
                : 'Versé en trop, sans manquant à couvrir';
            default: return 'Reste dû sur des jours avant la période';
        }
    }

    trackByCommercial(_: number, line: CommercialReconciliationLine): string {
        return line.commercialUsername;
    }

    trackByAlert(index: number, alert: CockpitAlert): string {
        return `${alert.type}-${alert.commercialUsername}-${index}`;
    }
}
