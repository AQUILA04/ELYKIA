import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DailyReportService } from '../../service/daily-report.service';
import { DailyCommercialReport, creditToDeposit, tontineToDeposit, newBalanceToDeposit, remainingCredit, remainingTontine, remainingNewBalance, totalRemainingToDeposit } from '../../models/daily-commercial-report.model';
import { CommercialYearlySummary } from '../../models/commercial-yearly-summary.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ClientService } from 'src/app/client/service/client.service';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CashDepositModalComponent } from '../../components/cash-deposit-modal/cash-deposit-modal.component';
import { DailyOperationLog } from '../../models/daily-operation-log.model';
import { DailyOperationService } from '../../service/daily-operation.service';
import { CashDepositService } from '../../service/cash-deposit.service';
import { UserService } from "../../../user/service/user.service";
import { UserProfile } from "../../../shared/models/user-profile.enum";
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
    selector: 'app-daily-report',
    templateUrl: './daily-report.component.html',
    styleUrls: ['./daily-report.component.scss'],
    providers: [DatePipe],
    standalone: false
})
export class DailyReportComponent implements OnInit {
    reports: DailyCommercialReport[] = [];
    filteredReports: DailyCommercialReport[] = []; // For display if we needed client-side filtering, but backend does it.

    // Filters
    range = new FormGroup({
        start: new FormControl<Date | null>(new Date()),
        end: new FormControl<Date | null>(new Date())
    });

    selectedFilter: 'today' | 'week' | 'month' | 'custom' = 'today';

    // Commercial Selector
    agents: any[] = [];
    selectedAgent: string | null = null;

    // UI State
    isLoading = false;
    isPromoter = false;
    isRecoveryManager = false;
    isManager = false;
    isSecretary = false;
    showMargins = false; // Toggle for margin visibility
    isDownloading = false;

    // Operations Log
    operations: DailyOperationLog[] = [];
    operationsTotal = 0;
    operationsPage = 0;
    operationsPageSize = 20;
    selectedOperationType: string | null = null;
    readonly operationTypes: { value: string; label: string }[] = [
        { value: 'CREDIT_COLLECTION', label: 'CREDIT_COLLECTION' },
        { value: 'CREDIT_COLLECTION_CANCEL', label: 'CREDIT_COLLECTION_CANCEL' },
        { value: 'TONTINE_COLLECTION', label: 'TONTINE_COLLECTION' },
        { value: 'TONTINE_COLLECTION_CANCEL', label: 'TONTINE_COLLECTION_CANCEL' },
        { value: 'ORDER', label: 'ORDER' },
        { value: 'NEW_ACCOUNT', label: 'NEW_ACCOUNT' },
        { value: 'CASH_DEPOSIT', label: 'CASH_DEPOSIT' },
        { value: 'CASH_DEPOSIT_CANCEL', label: 'CASH_DEPOSIT_CANCEL' },
        { value: 'STOCK_RETURN', label: 'STOCK_RETURN' },
        { value: 'STOCK_REQUEST', label: 'STOCK_REQUEST' },
        { value: 'STOCK_TONTINE_REQUEST', label: 'STOCK_TONTINE_REQUEST' },
        { value: 'STOCK_TONTINE_RETURN', label: 'STOCK_TONTINE_RETURN' },
        { value: 'TONTINE_DELIVERY', label: 'TONTINE_DELIVERY' },
        { value: 'CREDIT_SALES', label: 'CREDIT_SALES' },
        { value: 'NEW_CLIENT', label: 'NEW_CLIENT' },
        { value: 'TONTINE_MEMBER_ENROLLMENT', label: 'TONTINE_MEMBER_ENROLLMENT' },
    ];

    today = new Date(); // Added for datepicker max date

    // Deposits History
    deposits: any[] = [];
    depositsTotal = 0;
    depositsPage = 0;
    depositsPageSize = 20;

    aggregatedReportData: any = null;
    yearlySummary: CommercialYearlySummary | null = null;
    yearlySummaryLoading = false;
    summaryYear = new Date().getFullYear();

    constructor(
        private dailyReportService: DailyReportService,
        private tokenStorage: TokenStorageService,
        private clientService: ClientService,
        private datePipe: DatePipe,
        private dialog: MatDialog,
        private dailyOperationService: DailyOperationService,
        private cashDepositService: CashDepositService,
        private userService: UserService,
        private alertService: AlertService
    ) { }

    ngOnInit(): void {
        // Check if profil is object with name or just string, handling both just in case
        this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
        this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
        this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
        this.isRecoveryManager = this.userService.hasProfile(UserProfile.RECOVERY_MANAGER);

        if (!this.isPromoter) {
            this.loadAgents();
        }

        // Initial Load (Today)
        this.setFilter('today');
        this.loadYearlySummary();
    }

    loadAgents(): void {
        this.clientService.getAgents().subscribe({
            next: (data) => {
                this.agents = data;
            },
            error: (err) => console.error('Error loading agents', err)
        });
    }

    onAgentChange(agent: string | { username: string } | null) {
        if (agent == null) {
            this.selectedAgent = null;
        } else if (typeof agent === 'string') {
            this.selectedAgent = agent;
        } else {
            this.selectedAgent = agent.username ?? null;
        }
        this.loadReports();
        this.loadYearlySummary();
    }

    searchAgent = (term: string, item: any) => {
        return item.username.toLowerCase().includes(term.toLowerCase());
    }
    setFilter(filter: 'today' | 'week' | 'month' | 'custom') {
        this.selectedFilter = filter;
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (filter) {
            case 'today':
                // Start and End are today
                break;
            case 'week':
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                start = new Date(today.setDate(diff));
                end = new Date(); // To current moment or end of week? Usually "This week so far"
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date();
                break;
            case 'custom':
                // Don't fetch yet, wait for user to apply
                return;
        }

        this.range.setValue({ start, end });
        this.loadReports();
    }

    applyCustomFilter() {
        if (this.range.value.start && this.range.value.end) {
            if (this.range.value.start > this.range.value.end) {
                // Invalid range
                return;
            }
            this.loadReports();
        }
    }

    loadReports() {
        this.isLoading = true;
        const startStr = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
        const endStr = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
        const collector = this.selectedAgent || undefined;

        this.dailyReportService.getReports(startStr, endStr, collector).subscribe({
            next: (data) => {
                this.reports = this.selectedAgent
                    ? data.filter(r => r.commercialUsername === this.selectedAgent)
                    : data;
                this.calculateAggregatedReport();
                this.isLoading = false;

                // Also load operations if a specific day is selected (start == end) or logic allows
                // Currently only loading operations if single day or handling range?
                // The API supports single date. If range, maybe default to start date or end date?
                // Let's load for the 'end' date which is 'today' in default view.
                this.loadOperations();
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
            }
        });
    }

    loadYearlySummary(): void {
        const collector = this.isPromoter
            ? this.tokenStorage.getUser().username
            : this.selectedAgent;

        if (!collector) {
            this.yearlySummary = null;
            return;
        }

        this.yearlySummaryLoading = true;
        this.dailyReportService.getYearlySummary(this.summaryYear, collector).subscribe({
            next: (data) => {
                this.yearlySummary = data ?? this.buildEmptyYearlySummary(collector);
                this.yearlySummaryLoading = false;
            },
            error: (err) => {
                console.error('Error loading yearly summary', err);
                this.yearlySummary = this.buildEmptyYearlySummary(collector);
                this.yearlySummaryLoading = false;
            }
        });
    }

    get yearlySummaryView(): CommercialYearlySummary {
        const collector = this.activeCommercialUsername ?? '';
        return this.yearlySummary ?? this.buildEmptyYearlySummary(collector);
    }

    private buildEmptyYearlySummary(collector: string): CommercialYearlySummary {
        return {
            year: this.summaryYear,
            commercialUsername: collector,
            totalCreditSalesAmount: 0,
            totalCreditSalesCount: 0,
            totalCreditDepositedAmount: 0,
            remainingAtClientsAmount: 0
        };
    }

    get activeCommercialUsername(): string | null {
        if (this.isPromoter) {
            return this.tokenStorage.getUser()?.username ?? null;
        }
        return this.selectedAgent;
    }

    calculateAggregatedReport() {
        const uniqueCommercials = new Set(this.reports.map(r => r.commercialUsername)).size;

        if (uniqueCommercials <= 1) {
            this.aggregatedReportData = null;
            return;
        }
        this.aggregatedReportData = {
            creditSalesAmount: this.reports.reduce((sum, r) => sum + (r.creditSalesAmount || 0), 0),
            collectionsAmount: this.reports.reduce((sum, r) => sum + (r.collectionsAmount || 0), 0),
            totalStockRequestAmount: this.reports.reduce((sum, r) => sum + (r.totalStockRequestAmount || 0), 0),
            creditSalesCount: this.reports.reduce((sum, r) => sum + (r.creditSalesCount || 0), 0),
            newClientsCount: this.reports.reduce((sum, r) => sum + (r.newClientsCount || 0), 0),
            newAccountsBalance: this.reports.reduce((sum, r) => sum + (r.newAccountsBalance || 0), 0),
            collectionsCount: this.reports.reduce((sum, r) => sum + (r.collectionsCount || 0), 0),
            ordersCount: this.reports.reduce((sum, r) => sum + (r.ordersCount || 0), 0),
            ordersAmount: this.reports.reduce((sum, r) => sum + (r.ordersAmount || 0), 0),
            tontineMembersCount: this.reports.reduce((sum, r) => sum + (r.tontineMembersCount || 0), 0),
            tontineCollectionsCount: this.reports.reduce((sum, r) => sum + (r.tontineCollectionsCount || 0), 0),
            tontineCollectionsAmount: this.reports.reduce((sum, r) => sum + (r.tontineCollectionsAmount || 0), 0),
            tontineDeliveriesCount: this.reports.reduce((sum, r) => sum + (r.tontineDeliveriesCount || 0), 0),
            tontineDeliveriesAmount: this.reports.reduce((sum, r) => sum + (r.tontineDeliveriesAmount || 0), 0),
            totalAmountToDeposit: this.reports.reduce((sum, r) => sum + (r.totalAmountToDeposit || 0), 0),
            totalAmountDeposited: this.reports.reduce((sum, r) => sum + (r.totalAmountDeposited || 0), 0),
            creditSalesMargin: this.reports.reduce((sum, r) => sum + (r.creditSalesMargin || 0), 0),
            stockRequestMargin: this.reports.reduce((sum, r) => sum + (r.stockRequestMargin || 0), 0),
            totalAdvancesAmount: this.reports.reduce((sum, r) => sum + (r.totalAdvancesAmount || 0), 0),
            totalReliquatGeneratedAmount: this.reports.reduce((sum, r) => sum + (r.totalReliquatGeneratedAmount || 0), 0),
            totalReliquatUsedAmount: this.reports.reduce((sum, r) => sum + (r.totalReliquatUsedAmount || 0), 0),
        };
    }

    loadOperations() {
        const start = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
        const end = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
        const collector = this.selectedAgent || (this.isPromoter ? this.tokenStorage.getUser().username : undefined);

        this.dailyOperationService.getOperations(
            start,
            end,
            collector,
            this.operationsPage,
            this.operationsPageSize,
            this.selectedOperationType
        ).subscribe({
            next: (res) => {
                this.operations = res.content;
                this.operationsTotal = res.page.totalElements;
            },
            error: (err) => console.error('Error loading operations', err)
        });
        this.loadDeposits(start, end, collector);
    }

    onOperationTypeFilterChange(): void {
        this.operationsPage = 0;
        this.loadOperations();
    }

    loadDeposits(start: string, end: string, collector?: string) {
        this.cashDepositService.getDeposits(start, end, collector, this.depositsPage, this.depositsPageSize).subscribe({
            next: (res) => {
                this.deposits = res.content;
                this.depositsTotal = res.page.totalElements;
            },
            error: (err) => console.error('Error loading deposits', err)
        });
    }

    onPageChange(event: any) {
        this.operationsPage = event.pageIndex;
        this.operationsPageSize = event.pageSize;
        this.loadOperations();
    }

    onDepositsPageChange(event: any) {
        this.depositsPage = event.pageIndex;
        this.depositsPageSize = event.pageSize;
        // Reload checks current selection
        this.loadOperations();
    }

    resetFilters() {
        this.selectedAgent = null;
        this.selectedOperationType = null;
        this.operationsPage = 0;
        this.setFilter('today');
        this.loadYearlySummary();
    }

    toggleMargins() {
        this.showMargins = !this.showMargins;
    }

    // --- Cash Management ---

    get totalAmountToDeposit(): number {
        return this.reports.reduce((sum, r) => sum + (r.totalAmountToDeposit || 0), 0);
    }

    get totalAmountDeposited(): number {
        return this.reports.reduce((sum, r) => sum + (r.totalAmountDeposited || 0), 0);
    }

    get remainingAmount(): number {
        return this.totalAmountToDeposit - this.totalAmountDeposited;
    }

    get periodStart(): string {
        return this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
    }

    get periodEnd(): string {
        return this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
    }

    get isSingleDay(): boolean {
        if (this.selectedFilter === 'today') {
            return true;
        }
        if (this.selectedFilter === 'custom' && this.range.value.start && this.range.value.end) {
            const start = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd');
            const end = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd');
            return start === end;
        }
        return false;
    }

    openDepositModal(report?: DailyCommercialReport) {
        const commercialToUse = report?.commercialUsername || this.selectedAgent;

        if (!commercialToUse) {
            return;
        }

        const targetReport = report || this.reports.find(r => r.commercialUsername === commercialToUse);
        if (!targetReport) {
            return;
        }

        const remaining = totalRemainingToDeposit(targetReport);

        let depositDate: string | null = null;
        if (this.isSingleDay) {
            depositDate = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd');
        }

        const dialogRef = this.dialog.open(CashDepositModalComponent, {
            width: '920px',
            maxWidth: '96vw',
            panelClass: 'cash-deposit-dialog-panel',
            data: {
                commercialUsername: commercialToUse,
                remainingAmount: remaining,
                remainingCredit: remainingCredit(targetReport),
                remainingTontine: remainingTontine(targetReport),
                remainingNewBalance: remainingNewBalance(targetReport),
                date: depositDate
            },
            disableClose: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadReports();
                this.loadYearlySummary();
                const start = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
                const end = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
                const collector = this.selectedAgent || (this.isPromoter ? this.tokenStorage.getUser().username : undefined);
                this.loadDeposits(start, end, collector);
            }
        });
    }

    getCreditToDeposit(report: DailyCommercialReport): number {
        return creditToDeposit(report);
    }

    getTontineToDeposit(report: DailyCommercialReport): number {
        return tontineToDeposit(report);
    }

    getNewBalanceToDeposit(report: DailyCommercialReport): number {
        return newBalanceToDeposit(report);
    }

    getRemainingCredit(report: DailyCommercialReport): number {
        return remainingCredit(report);
    }

    getRemainingTontine(report: DailyCommercialReport): number {
        return remainingTontine(report);
    }

    getRemainingNewBalance(report: DailyCommercialReport): number {
        return remainingNewBalance(report);
    }

    getTotalRemaining(report: DailyCommercialReport): number {
        return totalRemainingToDeposit(report);
    }
    getDepositStatus(report: DailyCommercialReport): 'status-red' | 'status-green' | 'status-orange' {
        const toDeposit = (report.totalAmountToDeposit || 0);
        const deposited = (report.totalAmountDeposited || 0);
        const remaining = this.getTotalRemaining(report);

        if (remaining > 0) {
            return 'status-red';
        } else if (toDeposit === deposited) {
            return 'status-green';
        } else {
            return 'status-orange';
        }
    }

    canCancelDeposit(dep: any): boolean {
        if (!this.isManager || dep.amount <= 0) return false;

        // Ensure not already cancelled
        const origRef = dep.reference || dep.id;
        const isAlreadyCancelled = this.deposits.some((d: any) =>
            d.amount < 0 && d.reference === `CANCEL-${origRef}`);
        if (isAlreadyCancelled) return false;

        const depDate = new Date(dep.date);
        const today = new Date();
        depDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - depDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= 3;
    }

    confirmCancelDeposit(dep: any) {
        this.alertService.showConfirmation(
            'Annulation',
            'Êtes-vous sûr de vouloir annuler ce versement ?',
            'Oui, annuler'
        ).then((confirmed) => {
            if (confirmed) {
                this.cashDepositService.cancelDeposit(dep.id).subscribe({
                    next: () => {
                        this.alertService.showSuccess('Versement annulé avec succès.');
                        this.loadReports();
                        this.loadYearlySummary();
                    },
                    error: (err) => {
                        console.error('Erreur lors de l\'annulation', err);
                        this.alertService.showError(err.error?.message || 'Erreur lors de l\'annulation du versement');
                    }
                });
            }
        });
    }

    onExportJournal() {
        const start = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
        const end = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
        const collector = this.selectedAgent || (this.isPromoter ? this.tokenStorage.getUser().username : undefined);

        this.dailyOperationService.exportPdf(start, end, collector, this.selectedOperationType).subscribe({
            next: (data: Blob) => {
                const blob = new Blob([data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `journal_operations_${start}_${end}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => console.error('Error downloading PDF', err)
        });
    }

    onDownloadReportPdf(report: DailyCommercialReport) {
        if (this.isDownloading) return;
        this.isDownloading = true;
        const start = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
        const end = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
        const commercialUsername = report.commercialUsername;

        this.dailyReportService.exportPdf(start, end, commercialUsername).subscribe({
            next: (data: Blob) => {
                const blob = new Blob([data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `rapport_journalier_${commercialUsername}_${start}_${end}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                this.isDownloading = false;
            },
            error: (err) => {
                console.error('Error downloading PDF', err);
                this.isDownloading = false;
            }
        });
    }
}

