import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DailyReportService } from '../../service/daily-report.service';
import { DailyCommercialReport } from '../../models/daily-commercial-report.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ClientService } from 'src/app/client/service/client.service';
import { UserProfilConstant } from 'src/app/shared/constants/user-profil.constant';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CashDepositModalComponent } from '../../components/cash-deposit-modal/cash-deposit-modal.component';
import { DailyOperationLog } from '../../models/daily-operation-log.model';
import { DailyOperationService } from '../../service/daily-operation.service';
import { CashDepositService } from '../../service/cash-deposit.service';

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

    constructor(
        private dailyReportService: DailyReportService,
        private tokenStorage: TokenStorageService,
        private clientService: ClientService,
        private datePipe: DatePipe,
        private dialog: MatDialog,
        private dailyOperationService: DailyOperationService,
        private cashDepositService: CashDepositService
    ) { }

    ngOnInit(): void {
        const currentUser = this.tokenStorage.getUser();
        // Check if profil is object with name or just string, handling both just in case
        this.isPromoter = (currentUser?.profil?.name === UserProfilConstant.PROMOTER) || (currentUser?.profil === UserProfilConstant.PROMOTER);

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

    loadOperations() {
        const start = this.datePipe.transform(this.range.value.start, 'yyyy-MM-dd') || '';
        const end = this.datePipe.transform(this.range.value.end, 'yyyy-MM-dd') || '';
        const collector = this.selectedAgent || (this.isPromoter ? this.tokenStorage.getUser().username : undefined);

        this.dailyOperationService.getOperations(start, end, collector, this.operationsPage, this.operationsPageSize).subscribe({
            next: (res) => {
                this.operations = res.content;
                this.operationsTotal = res.totalElements;
            },
            error: (err) => console.error('Error loading operations', err)
        });
        this.loadDeposits(start, end, collector);
    }

    loadDeposits(start: string, end: string, collector?: string) {
        this.cashDepositService.getDeposits(start, end, collector, this.depositsPage, this.depositsPageSize).subscribe({
            next: (res) => {
                this.deposits = res.content;
                this.depositsTotal = res.totalElements;
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
}
