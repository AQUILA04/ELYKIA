import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DailyReportService } from '../../service/daily-report.service';
import { DailyCommercialReport } from '../../models/daily-commercial-report.model';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ClientService } from 'src/app/client/service/client.service';
import { UserProfilConstant } from 'src/app/shared/constants/user-profil.constant';
import { DatePipe } from '@angular/common';

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

    today = new Date(); // Added for datepicker max date

    constructor(
        private dailyReportService: DailyReportService,
        private tokenStorage: TokenStorageService,
        private clientService: ClientService,
        private datePipe: DatePipe
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
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
            }
        });
    }

    resetFilters() {
        this.selectedAgent = null;
        this.setFilter('today');
    }
}
