import { AfterViewInit, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { UserService } from 'src/app/user/service/user.service';
import { CashPeriodRemittanceService } from '../../service/cash-period-remittance.service';
import { CashPeriodRemittanceTabComponent } from '../../components/cash-period-remittance-tab/cash-period-remittance-tab.component';
import { GuidedTourService } from '../../../shared/report-ui/guided-tour/guided-tour.service';
import { REMITTANCE_TOUR } from '../../report-tours';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Remise au gestionnaire, nouvelle présentation (/report/daily/remittance).
 * La logique (période, dépenses, net, soumission, réception, historique) est celle de l'onglet « Remise »
 * de l'ancienne présentation, héritée telle quelle ; seule la présentation change.
 * Période : un mois, puis une plage Du / Au comprise dans ce mois (contrainte du serveur).
 */
@Component({
    selector: 'app-report-remittance',
    templateUrl: './report-remittance.component.html',
    styleUrls: ['./report-remittance.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class ReportRemittanceComponent extends CashPeriodRemittanceTabComponent implements OnInit, AfterViewInit, OnDestroy {
    currentDate = new Date();
    /** L'onglet « Remise » de l'ancienne présentation exige les KPI financiers du rapport. */
    canOpenClassic = false;

    private clock: ReturnType<typeof setInterval> | null = null;
    private tourTimer: ReturnType<typeof setTimeout> | null = null;
    private allowed = false;

    constructor(
        remittanceService: CashPeriodRemittanceService,
        userService: UserService,
        snackBar: MatSnackBar,
        private route: ActivatedRoute,
        private router: Router,
        private tour: GuidedTourService,
        private tokenStorage: TokenStorageService
    ) {
        super(remittanceService, userService, snackBar);
    }

    override ngOnInit(): void {
        this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
        this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
        this.allowed = this.isManager || this.isSecretary;
        if (!this.allowed) {
            // Comme l'onglet « Remise » : réservé au gestionnaire et au secrétaire.
            void this.router.navigate(['/report/daily'], { replaceUrl: true });
            return;
        }
        const roles: string[] = this.tokenStorage.getUser()?.roles || [];
        this.canOpenClassic = roles.includes(KpiFinancierPermissions.RapportJournalier);
        this.applyQueryParams();
        this.loadSummary();
        this.loadHistory();
        this.clock = setInterval(() => { this.currentDate = new Date(); }, 1000);
    }

    ngAfterViewInit(): void {
        if (!this.allowed) {
            return;
        }
        const forceTour = this.route.snapshot.queryParamMap.get('tour') === '1';
        // Laisse le résumé se charger et le DOM se peindre avant de viser les zones de la visite.
        this.tourTimer = setTimeout(() => {
            if (forceTour) {
                this.tour.start(REMITTANCE_TOUR);
            } else {
                this.tour.startIfFirstVisit(REMITTANCE_TOUR);
            }
        }, 800);
    }

    ngOnDestroy(): void {
        if (this.clock) {
            clearInterval(this.clock);
        }
        if (this.tourTimer) {
            clearTimeout(this.tourTimer);
        }
    }

    /** Mois affiché dans le navigateur de période, en français : « Novembre 2026 ». */
    get monthTitle(): string {
        return `${this.getMonthLabel(this.selectedMonth)} ${this.selectedYear}`;
    }

    /** Le mois en cours est le dernier proposé : pas de remise sur un mois futur. */
    get isCurrentMonth(): boolean {
        const today = new Date();
        return this.selectedYear > today.getFullYear()
            || (this.selectedYear === today.getFullYear() && this.selectedMonth >= today.getMonth() + 1);
    }

    /** Une remise en attente fige la période, comme les dates Du / Au. */
    get monthLocked(): boolean {
        return this.datesLocked || this.isLoading || this.isSubmitting;
    }

    shiftMonth(delta: number): void {
        if (this.monthLocked || (delta > 0 && this.isCurrentMonth)) {
            return;
        }
        const target = new Date(this.selectedYear, this.selectedMonth - 1 + delta, 1);
        this.selectedYear = target.getFullYear();
        this.selectedMonth = target.getMonth() + 1;
        this.onPeriodChange();
    }

    override onPeriodChange(): void {
        super.onPeriodChange();
        this.syncUrl();
    }

    override onDateRangeChange(): void {
        super.onDateRangeChange();
        if (this.selectedStartDate && this.selectedEndDate && this.selectedStartDate <= this.selectedEndDate) {
            this.syncUrl();
        }
    }

    startTour(): void {
        this.tour.start(REMITTANCE_TOUR);
    }

    /** Ouvre l'onglet « Remise » de l'ancienne présentation. */
    get classicQueryParams(): Record<string, string> {
        return { tab: 'remittance' };
    }

    /** Lit `?year=&month=&start=&end=` ; une valeur invalide ou hors du mois est ignorée. */
    private applyQueryParams(): void {
        const params = this.route.snapshot.queryParamMap;
        const year = Number(params.get('year'));
        const month = Number(params.get('month'));
        if (Number.isInteger(year) && year >= 2000 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12) {
            this.selectedYear = year;
            this.selectedMonth = month;
        }
        this.resetDateRange();
        const start = params.get('start');
        const end = params.get('end');
        if (start && end && ISO_DATE.test(start) && ISO_DATE.test(end)
            && start <= end && start >= this.minDate && end <= this.maxDate) {
            this.selectedStartDate = start;
            this.selectedEndDate = end;
        }
    }

    private syncUrl(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                year: this.selectedYear,
                month: this.selectedMonth,
                start: this.selectedStartDate || null,
                end: this.selectedEndDate || null,
                tour: null
            },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }
}
