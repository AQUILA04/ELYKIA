import { AfterViewInit, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ClientService } from 'src/app/client/service/client.service';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { RecoveryManagerService } from '../../../credit/service/recovery-manager.service';
import { RecoveryManagerReportTabComponent } from '../../components/recovery-manager-report-tab/recovery-manager-report-tab.component';
import { AgentOption } from '../../components/report-filter-bar/report-filter-bar.component';
import { ReportFilters, classicParams, filtersFromParams, filtersToParams } from '../../models/report-period';
import { GuidedTourService } from '../../../shared/report-ui/guided-tour/guided-tour.service';
import { RECOVERY_TOUR } from '../../report-tours';

const RECOVERY_MANAGER_PROFILE = 'RECOVERY_MANAGER';

export interface RecoveryManagerOption {
    username: string;
    label: string;
}

/**
 * Recouvrement terrain, nouvelle présentation (/report/daily/recovery).
 * Les appels (activité, synthèse, taux du mois, opérations, PDF) sont ceux de l'onglet « Recouvrement »
 * de l'ancienne présentation, hérités tels quels ; la période et le commercial viennent de l'URL.
 * Le chef de recouvrement ne voit que ses opérations ; le gestionnaire choisit un chef ou voit tout.
 */
@Component({
    selector: 'app-report-recovery',
    templateUrl: './report-recovery.component.html',
    styleUrls: ['./report-recovery.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class ReportRecoveryComponent extends RecoveryManagerReportTabComponent implements OnInit, AfterViewInit, OnDestroy {
    filters!: ReportFilters;
    agents: AgentOption[] = [];
    recoveryManagerOptions: RecoveryManagerOption[] = [];
    currentDate = new Date();
    /** Fiche commercial et ancienne présentation exigent les KPI financiers du rapport. */
    canViewFinancialKpis = false;

    private readonly destroy$ = new Subject<void>();
    private clock: ReturnType<typeof setInterval> | null = null;
    private tourTimer: ReturnType<typeof setTimeout> | null = null;
    private allowed = false;
    private managersLoaded = false;
    private pendingDefaultManager = false;

    constructor(
        recoveryManagerService: RecoveryManagerService,
        userService: UserService,
        private route: ActivatedRoute,
        private router: Router,
        private clientService: ClientService,
        private tokenStorage: TokenStorageService,
        private tour: GuidedTourService
    ) {
        super(recoveryManagerService, userService);
    }

    override ngOnInit(): void {
        const isRecoveryManager = this.userService.hasProfile(UserProfile.RECOVERY_MANAGER);
        const isGestionnaire = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
        // Comme le bouton « Recouvrement terrain » du cockpit : chef de recouvrement et gestionnaire.
        this.allowed = isRecoveryManager || isGestionnaire;
        if (!this.allowed) {
            void this.router.navigate(['/report/daily'], { replaceUrl: true });
            return;
        }
        const roles: string[] = this.tokenStorage.getUser()?.roles || [];
        this.canViewFinancialKpis = roles.includes(KpiFinancierPermissions.RapportJournalier);

        // Le gestionnaire choisit un chef ; le chef ne voit que ses opérations. Sans nom transmis,
        // le serveur prend l'utilisateur connecté : un gestionnaire doit donc toujours envoyer un chef.
        this.isManager = isGestionnaire || this.userService.hasProfile(UserProfile.ADMIN);
        this.recoveryManagerUsername = this.isManager ? null : this.userService.getUsername();

        this.clientService.getAgents().pipe(takeUntil(this.destroy$)).subscribe({
            next: agents => { this.agents = agents || []; },
            error: () => { /* filtre commercial vide */ }
        });
        if (this.isManager) {
            this.loadRecoveryManagers();
        }
        this.clock = setInterval(() => { this.currentDate = new Date(); }, 1000);

        this.route.queryParamMap.pipe(
            map(params => ({ filters: filtersFromParams(params), manager: params.get('manager') })),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
            takeUntil(this.destroy$)
        ).subscribe(({ filters, manager }) => {
            this.filters = filters;
            this.startDate = filters.start;
            this.endDate = filters.end;
            this.commercialUsername = filters.commercial;
            this.currentPage = 0;
            if (this.isManager) {
                this.recoveryManagerUsername = manager || null;
                if (!manager) {
                    // Attend la liste des chefs : le premier est choisi par défaut (voir loadRecoveryManagers).
                    this.pendingDefaultManager = true;
                    this.selectDefaultManager();
                    return;
                }
            }
            this.loadData();
        });
    }

    /** Sans `?manager=`, le gestionnaire arrive sur le premier chef de recouvrement de la liste. */
    private selectDefaultManager(): void {
        if (!this.pendingDefaultManager || !this.managersLoaded) {
            return;
        }
        this.pendingDefaultManager = false;
        const first = this.recoveryManagerOptions[0];
        if (first) {
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { manager: first.username },
                queryParamsHandling: 'merge',
                replaceUrl: true
            });
        } else {
            // Aucun chef de recouvrement : rapport vide plutôt qu'un rapport du gestionnaire lui-même.
            this.summary = null;
            this.activity = null;
            this.monthlyRate = null;
            this.operations = [];
            this.totalElements = 0;
            this.isLoading = false;
        }
    }

    ngAfterViewInit(): void {
        if (!this.allowed) {
            return;
        }
        const forceTour = this.route.snapshot.queryParamMap.get('tour') === '1';
        this.tourTimer = setTimeout(() => {
            if (forceTour) {
                this.tour.start(RECOVERY_TOUR);
            } else {
                this.tour.startIfFirstVisit(RECOVERY_TOUR);
            }
        }, 800);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.clock) {
            clearInterval(this.clock);
        }
        if (this.tourTimer) {
            clearTimeout(this.tourTimer);
        }
    }

    onFiltersChange(filters: ReportFilters): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { ...filtersToParams(filters), tour: null },
            queryParamsHandling: 'merge'
        });
    }

    /** Choix du chef de recouvrement (gestionnaire). */
    onManagerSelect(username: string | null): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { manager: username || null, tour: null },
            queryParamsHandling: 'merge'
        });
    }

    refresh(): void {
        this.loadData();
    }

    startTour(): void {
        this.tour.start(RECOVERY_TOUR);
    }

    /** Taux du mois à une décimale, virgule française : « 42,5 % ». */
    get rateLabel(): string {
        if (!this.monthlyRate) {
            return '—';
        }
        const rounded = Math.round((Number(this.monthlyRate.recoveryRatePercent) || 0) * 10) / 10;
        return `${rounded.toString().replace('.', ',')}\u00a0%`;
    }

    /** Total « à remettre » de tous les commerciaux de la période. */
    get totalToRemit(): number {
        return (this.summary?.remittanceByCommercial || []).reduce((sum, line) => sum + (line.totalToRemit || 0), 0);
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.totalElements / this.pageSize));
    }

    goToPage(delta: number): void {
        const page = Math.max(0, Math.min(this.totalPages - 1, this.currentPage + delta));
        if (page !== this.currentPage) {
            this.onPageChange({ pageIndex: page, pageSize: this.pageSize });
        }
    }

    get pageInfo(): string {
        if (!this.totalElements) {
            return '0 opération';
        }
        const start = this.currentPage * this.pageSize + 1;
        const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
        return `${start}–${end} sur ${this.totalElements}`;
    }

    /** Ouvre l'onglet « Recouvrement » de l'ancienne présentation sur la même période. */
    get classicQueryParams(): Record<string, string> {
        return { ...classicParams(this.filters), tab: 'recovery' };
    }

    /** Paramètres de période gardés vers la fiche commercial et le cockpit. */
    get carryParams(): Record<string, string | null> {
        return filtersToParams({ ...this.filters, commercial: null });
    }

    searchManager = (term: string, item: RecoveryManagerOption): boolean =>
        item.label.toLowerCase().includes(term.toLowerCase());

    private loadRecoveryManagers(): void {
        this.userService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
            next: users => {
                this.recoveryManagerOptions = users
                    .filter(user => user?.profilName === RECOVERY_MANAGER_PROFILE)
                    .map(user => ({
                        username: user.username,
                        label: [user.username, [user.firstname, user.lastname].filter(Boolean).join(' ')]
                            .filter(Boolean).join(' · ')
                    }))
                    .sort((a, b) => a.username.localeCompare(b.username));
                this.managersLoaded = true;
                this.selectDefaultManager();
            },
            error: () => {
                // Liste indisponible : rapport vide, le gestionnaire peut actualiser.
                this.managersLoaded = true;
                this.selectDefaultManager();
            }
        });
    }
}
