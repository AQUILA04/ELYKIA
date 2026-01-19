import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {DailyReportService} from '../../service/daily-report.service';
import {DailyCommercialReport} from '../../models/daily-commercial-report.model';
import {TokenStorageService} from 'src/app/shared/service/token-storage.service';
import {ClientService} from 'src/app/client/service/client.service';
import {DatePipe} from '@angular/common';
import {MatDialog} from '@angular/material/dialog';
import {CashDepositModalComponent} from '../../components/cash-deposit-modal/cash-deposit-modal.component';
import {DailyOperationLog} from '../../models/daily-operation-log.model';
import {DailyOperationService} from '../../service/daily-operation.service';
import {CashDepositService} from '../../service/cash-deposit.service';
import {UserService} from "../../../user/service/user.service";
import {UserProfile} from "../../../shared/models/user-profile.enum";

@Component({
    selector: 'app-daily-report',
    templateUrl: './daily-report.component.html',
    styleUrls: ['./daily-report.component.scss'],
    providers: [DatePipe]
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
    showMargins = false; // Toggle for margin visibility

    // Operations Log
    operations: DailyOperationLog[] = [];
    operationsTotal = 0;
    operationsPage = 0;
    operationsPageSize = 20;

    today = new Date(); // Added for datepicker max date

    // Deposits History
    deposits: any[] = [];
    depositsTotal = 0;
    depositsPage = 0;
    depositsPageSize = 20;

    aggregatedReportData: any = null;

    constructor(
        private dailyReportService: DailyReportService,
        private tokenStorage: TokenStorageService,
        private clientService: ClientService,
        private datePipe: DatePipe,
        private dialog: MatDialog,
        private dailyOperationService: DailyOperationService,
        private cashDepositService: CashDepositService,
        private userService : UserService
    ) { }

    ngOnInit(): void {
        // Check if profil is object with name or just string, handling both just in case
        this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);

        if (!this.isPromoter) {
            this.loadAgents();
        }

        // Initial Load (Today)
        this.setFilter('today');
    }

    loadAgents(): void {
        this.clientService.getAgents().subscribe({
            next: (data) => {
                this.agents = data;
            },
            error: (err) => console.error('Error loading agents', err)
        });
    }

    onAgentChange(agent: any) {
        this.selectedAgent = agent ? agent.username : null;
        this.loadReports();
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
                this.reports = data;
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
        };
    }

    loadOperations() {
        const start = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
        const end = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
        const collector = this.selectedAgent || (this.isPromoter ? this.tokenStorage.getUser().username : undefined);

        this.dailyOperationService.getOperations(start, end, collector, this.operationsPage, this.operationsPageSize).subscribe({
            next: (res) => {
                this.operations = res.content;
                this.operationsTotal = res.page.totalElements;
            },
            error: (err) => console.error('Error loading operations', err)
        });
        this.loadDeposits(start, end, collector);
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
        this.setFilter('today');
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

    openDepositModal(report?: DailyCommercialReport) {
        const commercialToUse = report?.commercialUsername || this.selectedAgent;

        if (!commercialToUse) {
            return;
        }

        const amountToDeposit = report ? (report.totalAmountToDeposit || 0) : this.totalAmountToDeposit;
        const amountDeposited = report ? (report.totalAmountDeposited || 0) : this.totalAmountDeposited;
        const remaining = amountToDeposit - amountDeposited;

        const dialogRef = this.dialog.open(CashDepositModalComponent, {
            width: '800px',
            data: {
                commercialUsername: commercialToUse,
                totalAmountToDeposit: amountToDeposit,
                remainingAmount: remaining
            },
            disableClose: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadReports();
            }
        });
    }
    getDepositStatus(report: DailyCommercialReport): 'status-red' | 'status-green' | 'status-orange' {
        const toDeposit = report.totalAmountToDeposit || 0;
        const deposited = report.totalAmountDeposited || 0;

        if (toDeposit > deposited) {
            return 'status-red';
        } else if (toDeposit === deposited) {
            return 'status-green';
        } else {
            return 'status-orange';
        }
    }
}
