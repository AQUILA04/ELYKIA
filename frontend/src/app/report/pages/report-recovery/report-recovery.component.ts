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
import {
    RecoveryBoardAttention,
    RecoveryBoardDto,
    RecoveryBoardManagerRow,
    RecoveryBoardPriorityLate
} from '../../../credit/models/recovery-manager.model';
import { RecoveryManagerReportTabComponent } from '../../components/recovery-manager-report-tab/recovery-manager-report-tab.component';
import { AgentOption } from '../../components/report-filter-bar/report-filter-bar.component';
import { ReportFilters, classicParams, filtersFromParams, filtersToParams } from '../../models/report-period';
import { GuidedTourService } from '../../../shared/report-ui/guided-tour/guided-tour.service';
import { RECOVERY_TOUR } from '../../report-tours';

const RECOVERY_MANAGER_PROFILE = 'RECOVERY_MANAGER';
/** Valeur de la liste des chefs pour « Tous les chefs » (pas de `?manager=`). */
export const ALL_MANAGERS = '';

export interface RecoveryManagerOption {
    username: string;
    label: string;
}

export interface TrendBar {
    date: string;
    amount: number;
    operationsCount: number;
    heightPercent: number;
    label: string;
    monthStart: boolean;
}

/**
 * Recouvrement terrain : board de pilotage (/report/daily/recovery).
 * Le board (`GET /recovery-manager/board`) donne KPI, tendance, retards prioritaires, points
 * d'attention et, pour le gestionnaire sans chef choisi, les chefs côte à côte.
 * Pour un chef, l'activité terrain, les opérations et le PDF restent ceux de l'ancien onglet (hérités).
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
    recoveryManagerOptions: RecoveryManagerOption[] = [{ username: ALL_MANAGERS, label: 'Tous les chefs' }];
    currentDate = new Date();
    /** Fiche commercial et ancienne présentation exigent les KPI financiers du rapport. */
    canViewFinancialKpis = false;

    board: RecoveryBoardDto | null = null;
    boardError = false;
    trendBars: TrendBar[] = [];

    private readonly destroy$ = new Subject<void>();
    private clock: ReturnType<typeof setInterval> | null = null;
    private tourTimer: ReturnType<typeof setTimeout> | null = null;
    private allowed = false;
    private boardRequest = 0;

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

        // Le gestionnaire voit tous les chefs (pas de `?manager=`) ou un chef ; le chef ne voit que lui.
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
            }
            this.loadData();
        });
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

    /** Gestionnaire sans chef choisi : vue « Tous les chefs ». */
    get isTeamView(): boolean {
        return this.isManager && !this.recoveryManagerUsername;
    }

    get managerSelectValue(): string {
        return this.recoveryManagerUsername || ALL_MANAGERS;
    }

    /**
     * Board pour tous les profils ; activité terrain et opérations seulement pour un chef
     * (les endpoints historiques ne savent pas agréger plusieurs chefs).
     */
    override loadData(): void {
        this.loadBoard();
        if (this.isTeamView) {
            this.activity = null;
            this.operations = [];
            this.totalElements = 0;
            return;
        }
        this.loadActivity();
        this.loadOperations();
    }

    private loadBoard(): void {
        const request = ++this.boardRequest;
        this.isLoading = true;
        this.boardError = false;
        this.recoveryManagerService.getBoard({
            startDate: this.startDate,
            endDate: this.endDate,
            recoveryManagerUsername: this.recoveryManagerUsername || undefined,
            commercialUsername: this.commercialUsername || undefined
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                if (request !== this.boardRequest) {
                    return;
                }
                this.board = res?.statusCode === 200 && res.data ? res.data as RecoveryBoardDto : null;
                this.boardError = !this.board;
                this.trendBars = this.buildTrend(this.board);
                this.isLoading = false;
            },
            error: () => {
                if (request !== this.boardRequest) {
                    return;
                }
                this.board = null;
                this.boardError = true;
                this.trendBars = [];
                this.isLoading = false;
            }
        });
    }

    private loadActivity(): void {
        this.activity = null;
        this.recoveryManagerService.getActivity({
            startDate: this.startDate,
            endDate: this.endDate,
            recoveryManagerUsername: this.recoveryManagerUsername || undefined,
            commercialUsername: this.commercialUsername || undefined
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                if (res?.statusCode === 200 && res.data) {
                    this.activity = res.data;
                }
            },
            error: () => { this.activity = null; }
        });
    }

    onFiltersChange(filters: ReportFilters): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { ...filtersToParams(filters), tour: null },
            queryParamsHandling: 'merge'
        });
    }

    /** Choix du chef de recouvrement (gestionnaire) ; « Tous les chefs » retire `?manager=`. */
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

    // --- KPI -------------------------------------------------------------------------------

    /** Pourcentage à une décimale, virgule française : « 42,5 % ». */
    percent(value: number | null | undefined): string {
        if (value == null || isNaN(Number(value))) {
            return '—';
        }
        const rounded = Math.round(Number(value) * 10) / 10;
        return `${rounded.toString().replace('.', ',')} %`;
    }

    signedPercent(value: number | null | undefined): string {
        if (value == null) {
            return '—';
        }
        const rounded = Math.round(Number(value));
        return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} %`;
    }

    get rateLabel(): string {
        return this.board ? this.percent(this.board.monthRate.ratePercent) : '—';
    }

    get boardMonthLabel(): string {
        if (!this.board) {
            return '';
        }
        const label = new Date(this.board.monthRate.year, this.board.monthRate.month - 1, 1)
            .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    /** Objectif du mois au prorata des jours écoulés (repère sur les barres). */
    expected(target: number | null | undefined): number | null {
        if (target == null || !this.board) {
            return null;
        }
        return Math.round(target * this.board.targets.elapsedRatio * 10) / 10;
    }

    get totalToRemit(): number {
        return (this.board?.remittanceByCommercial || []).reduce((sum, line) => sum + (line.totalToRemit || 0), 0);
    }

    get combinedCoverage(): number {
        const c = this.board?.monthCoverage;
        if (!c) {
            return 0;
        }
        const total = c.creditPortfolioTotal + c.tontinePortfolioTotal;
        return total > 0 ? Math.round(((c.creditControlsDone + c.tontineControlsDone) * 1000) / total) / 10 : 0;
    }

    trendClass(change: number | null | undefined): string {
        if (change == null || change === 0) {
            return '';
        }
        return change > 0 ? 'trend-up' : 'trend-down';
    }

    // --- Tendance --------------------------------------------------------------------------

    private buildTrend(board: RecoveryBoardDto | null): TrendBar[] {
        const points = board?.trend || [];
        const max = points.reduce((m, p) => Math.max(m, p.amount || 0), 0);
        return points.map(point => {
            const date = new Date(`${point.date}T00:00:00`);
            const day = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            const amount = point.amount || 0;
            return {
                date: point.date,
                amount,
                operationsCount: point.operationsCount || 0,
                heightPercent: max > 0 && amount > 0 ? Math.max(3, Math.round((amount / max) * 100)) : 0,
                label: `${day} : ${this.formatAmount(amount)} · ${point.operationsCount || 0} opération(s)`,
                monthStart: date.getDate() === 1
            };
        });
    }

    get trendTotal(): number {
        return this.trendBars.reduce((sum, bar) => sum + bar.amount, 0);
    }

    get trendFirstLabel(): string {
        return this.shortDate(this.trendBars[0]?.date);
    }

    get trendLastLabel(): string {
        return this.shortDate(this.trendBars[this.trendBars.length - 1]?.date);
    }

    trackByDate = (_: number, bar: TrendBar): string => bar.date;

    // --- Retards prioritaires --------------------------------------------------------------

    controlLabel(row: RecoveryBoardPriorityLate): string {
        if (!row.latestControlStatus) {
            return 'Jamais';
        }
        const date = this.shortDate(row.latestObservedAt);
        if (row.latestControlStatus === 'ECART') {
            const diff = row.latestDifferenceAmount;
            return `${date} · Écart${diff != null ? ' ' + this.formatAmount(diff, true) : ''}`;
        }
        return `${date} · Conforme`;
    }

    controlClass(row: RecoveryBoardPriorityLate): string {
        if (!row.latestControlStatus) {
            return 'gap-neg';
        }
        return row.latestControlStatus === 'ECART' ? 'gap-pos' : 'ctrl-ok';
    }

    trackByCredit = (_: number, row: RecoveryBoardPriorityLate): number => row.creditId;

    // --- Points d'attention ----------------------------------------------------------------

    attentionTitle(a: RecoveryBoardAttention): string {
        const chef = this.isTeamView && a.recoveryManagerUsername ? `${a.recoveryManagerUsername} · ` : '';
        switch (a.type) {
            case 'PENDING_ECARTS':
                return `${chef}${a.count} écart(s) de carnet en attente · ${this.formatAmount(a.amount)}`;
            case 'NEVER_CONTROLLED':
                return `${a.count} gros retard(s) jamais contrôlé(s) · ${this.formatAmount(a.amount)}`;
            case 'STALE_CONTROL':
                return `${a.count} gros retard(s) sans contrôle depuis plus de ${a.threshold ?? 30} jours`;
            case 'RATE_BELOW_TARGET':
                return `${chef}Taux du mois ${this.percent(a.value)} · repère ${this.percent(a.threshold)} à ce jour`;
            case 'COVERAGE_BELOW_TARGET':
                return `${chef}Couverture des carnets ${this.percent(a.value)} · repère ${this.percent(a.threshold)} à ce jour`;
            case 'MANAGER_INACTIVE':
                return a.value == null
                    ? `${a.recoveryManagerUsername} : aucune opération enregistrée`
                    : `${a.recoveryManagerUsername} : aucune opération depuis ${a.value} jours`;
            default:
                return '';
        }
    }

    attentionDetail(a: RecoveryBoardAttention): string {
        const commercials = (a.commercials || []).join(', ');
        switch (a.type) {
            case 'PENDING_ECARTS':
                return commercials ? `Le commercial doit accepter ou rejeter le constat : ${commercials}` : 'En attente de la décision du commercial';
            case 'NEVER_CONTROLLED':
                return `Parmi les retards prioritaires${commercials ? ' · ' + commercials : ''}`;
            case 'STALE_CONTROL':
                return a.lastDate ? `Plus ancien contrôle le ${this.shortDate(a.lastDate)}` : 'Parmi les retards prioritaires';
            case 'RATE_BELOW_TARGET':
                return `Objectif du mois : ${this.percent(this.board?.targets.monthlyRatePercent)}`;
            case 'COVERAGE_BELOW_TARGET':
                return `Objectif du mois : ${this.percent(this.board?.targets.coveragePercent)} du portefeuille en cours`;
            case 'MANAGER_INACTIVE':
                return a.lastDate ? `Dernière opération le ${this.shortDate(a.lastDate)}` : 'Aucune clôture de crédit connue';
            default:
                return '';
        }
    }

    attentionClass(a: RecoveryBoardAttention): string {
        return a.severity === 'HIGH' ? 'alert-late' : 'alert-surplus';
    }

    /** Écarts : page Écarts de carnet (gestionnaire) ; alerte d'un chef : sa vue ; retards : le tableau. */
    onAttention(a: RecoveryBoardAttention): void {
        if (a.type === 'PENDING_ECARTS' && this.isManager) {
            void this.router.navigate(['/carnet-ecarts']);
            return;
        }
        if (this.isTeamView && a.recoveryManagerUsername && a.type !== 'NEVER_CONTROLLED' && a.type !== 'STALE_CONTROL') {
            this.onManagerSelect(a.recoveryManagerUsername);
            return;
        }
        document.getElementById('recovery-priority')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    trackByAttention = (index: number, a: RecoveryBoardAttention): string =>
        `${a.type}-${a.recoveryManagerUsername || ''}-${index}`;

    // --- Vue équipe ------------------------------------------------------------------------

    get teamTotals(): { collected: number; operations: number; ecarts: number; verifications: number } {
        return (this.board?.team || []).reduce((acc, row) => ({
            collected: acc.collected + row.collectedAmount,
            operations: acc.operations + row.operationsCount,
            ecarts: acc.ecarts + row.ecartsCount,
            verifications: acc.verifications + row.carnetVerifications
        }), { collected: 0, operations: 0, ecarts: 0, verifications: 0 });
    }

    planLabel(row: RecoveryBoardManagerRow): string {
        const quarters = (row.todayPlanQuarters || []).join(', ');
        switch (row.todayPlanStatus) {
            case 'ACTIVE':
                return `Ouverte${quarters ? ' · ' + quarters : ''}`;
            case 'CLOSED':
                return `Clôturée${quarters ? ' · ' + quarters : ''}`;
            case 'DRAFT':
                return 'En préparation';
            default:
                return 'Aucune';
        }
    }

    belowTarget(value: number, target: number | null | undefined): boolean {
        const expected = this.expected(target);
        return expected != null && expected > 0 && value < expected;
    }

    /** Sans retard délai, le taux vaut 0 : pas de repère manqué à signaler. */
    rateBelowTarget(row: RecoveryBoardManagerRow): boolean {
        return !!this.board && this.board.monthRate.latePortfolioDue > 0
            && this.belowTarget(row.monthRatePercent, this.board.targets.monthlyRatePercent);
    }

    /** Sans dossier en cours, la couverture vaut 0 : pas de repère manqué à signaler. */
    coverageBelowTarget(row: RecoveryBoardManagerRow): boolean {
        return !!this.board && row.creditPortfolioTotal + row.tontinePortfolioTotal > 0
            && this.belowTarget(this.rowCoverage(row), this.board.targets.coveragePercent);
    }

    rowCoverage(row: RecoveryBoardManagerRow): number {
        const total = row.creditPortfolioTotal + row.tontinePortfolioTotal;
        return total > 0 ? Math.round(((row.creditControlsDone + row.tontineControlsDone) * 1000) / total) / 10 : 0;
    }

    trackByManager = (_: number, row: RecoveryBoardManagerRow): string => row.username;

    // --- Opérations, liens -----------------------------------------------------------------

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

    private shortDate(value: string | null | undefined): string {
        if (!value) {
            return '';
        }
        const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
        return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }

    private formatAmount(value: number, signed = false): string {
        const rounded = Math.round(Number(value) || 0);
        const text = Math.abs(rounded).toLocaleString('fr-FR').replace(/ | /g, ' ');
        const sign = signed ? (rounded > 0 ? '+' : rounded < 0 ? '−' : '') : (rounded < 0 ? '−' : '');
        return `${sign}${text} FCFA`;
    }

    private loadRecoveryManagers(): void {
        this.userService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
            next: users => {
                const chefs = users
                    .filter(user => user?.profilName === RECOVERY_MANAGER_PROFILE)
                    .map(user => ({
                        username: user.username,
                        label: [user.username, [user.firstname, user.lastname].filter(Boolean).join(' ')]
                            .filter(Boolean).join(' · ')
                    }))
                    .sort((a, b) => a.username.localeCompare(b.username));
                this.recoveryManagerOptions = [{ username: ALL_MANAGERS, label: 'Tous les chefs' }, ...chefs];
            },
            error: () => { /* la liste garde « Tous les chefs » */ }
        });
    }
}
