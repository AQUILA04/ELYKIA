import { Component, OnInit } from '@angular/core';
import { CashPeriodRemittanceService } from '../../service/cash-period-remittance.service';
import { CashPeriodRemittance, CashPeriodRemittanceSummary } from '../../models/cash-period-remittance.model';
import { Expense } from 'src/app/expense/models/expense.model';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-cash-period-remittance-tab',
    templateUrl: './cash-period-remittance-tab.component.html',
    styleUrls: ['./cash-period-remittance-tab.component.scss'],
    standalone: false
})
export class CashPeriodRemittanceTabComponent implements OnInit {
    selectedYear = new Date().getFullYear();
    selectedMonth = new Date().getMonth() + 1;
    summary: CashPeriodRemittanceSummary | null = null;
    history: CashPeriodRemittance[] = [];
    historyPage = 0;
    historyPageSize = 10;
    historyTotalElements = 0;
    historyTotalPages = 1;
    historyLoading = false;
    expandedHistoryIds = new Set<number>();
    isLoading = false;
    isSubmitting = false;
    isManager = false;
    isSecretary = false;

    selectedExpenseIds: Set<number> = new Set();
    computedExpenseAmount = 0;
    computedNetAmount = 0;

    months = [
        { value: 1, label: 'Janvier' },
        { value: 2, label: 'Février' },
        { value: 3, label: 'Mars' },
        { value: 4, label: 'Avril' },
        { value: 5, label: 'Mai' },
        { value: 6, label: 'Juin' },
        { value: 7, label: 'Juillet' },
        { value: 8, label: 'Août' },
        { value: 9, label: 'Septembre' },
        { value: 10, label: 'Octobre' },
        { value: 11, label: 'Novembre' },
        { value: 12, label: 'Décembre' }
    ];

    constructor(
        private remittanceService: CashPeriodRemittanceService,
        private userService: UserService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
        this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
        this.loadSummary();
        this.loadHistory();
    }

    onPeriodChange(): void {
        this.loadSummary();
    }

    refresh(): void {
        this.loadSummary();
        this.historyPage = 0;
        this.loadHistory();
    }

    loadSummary(): void {
        this.isLoading = true;
        this.remittanceService.getSummary(this.selectedYear, this.selectedMonth).subscribe({
            next: (summary) => {
                this.summary = summary;
                this.initExpenseSelection();
                this.isLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
            }
        });
    }

    loadHistory(): void {
        this.historyLoading = true;
        this.remittanceService.list(this.historyPage, this.historyPageSize).subscribe({
            next: (res) => {
                this.history = res.content || [];
                this.historyTotalElements = res.totalElements ?? this.history.length;
                this.historyTotalPages = res.totalPages ?? 1;
                this.historyLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.history = [];
                this.historyTotalElements = 0;
                this.historyTotalPages = 1;
                this.historyLoading = false;
            }
        });
    }

    changeHistoryPage(delta: number): void {
        this.historyPage = Math.max(0, Math.min(this.historyTotalPages - 1, this.historyPage + delta));
        this.loadHistory();
    }

    goHistoryPage(index: number): void {
        this.historyPage = index;
        this.loadHistory();
    }

    get historyPageNumbers(): number[] {
        return Array.from({ length: this.historyTotalPages }, (_, i) => i + 1);
    }

    getHistoryPaginationInfo(): string {
        if (this.historyTotalElements === 0) {
            return '0 résultat';
        }
        const start = this.historyPage * this.historyPageSize + 1;
        const end = Math.min((this.historyPage + 1) * this.historyPageSize, this.historyTotalElements);
        return `${start}–${end} sur ${this.historyTotalElements}`;
    }

    initExpenseSelection(): void {
        this.selectedExpenseIds = new Set();
        if (!this.summary) return;

        if (!this.summary.status) {
            // No remittance yet: pre-select all candidates
            (this.summary.candidateExpenses || []).forEach(e => {
                if (e.id) this.selectedExpenseIds.add(e.id);
            });
        } else if (this.summary.status === 'PENDING') {
            // Existing PENDING: pre-select all linked
            (this.summary.linkedExpenses || []).forEach(e => {
                if (e.id) this.selectedExpenseIds.add(e.id);
            });
        }
        this.recalculate();
    }

    toggleExpense(expense: Expense): void {
        if (!expense.id) return;
        if (this.summary?.status === 'RECEIVED') return;
        if (this.selectedExpenseIds.has(expense.id)) {
            this.selectedExpenseIds.delete(expense.id);
        } else {
            this.selectedExpenseIds.add(expense.id);
        }
        this.recalculate();
    }

    isExpenseSelected(expense: Expense): boolean {
        return !!expense.id && this.selectedExpenseIds.has(expense.id);
    }

    recalculate(): void {
        if (!this.summary) return;
        const expenses = this.getVisibleExpenses();
        this.computedExpenseAmount = expenses
            .filter(e => e.id && this.selectedExpenseIds.has(e.id))
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        this.computedNetAmount = (this.summary.totalAmount || 0) - this.computedExpenseAmount;
    }

    getVisibleExpenses(): Expense[] {
        if (!this.summary) return [];
        if (!this.summary.status) {
            return this.summary.candidateExpenses || [];
        }
        return this.summary.linkedExpenses || [];
    }

    get isReadOnly(): boolean {
        return this.summary?.status === 'RECEIVED';
    }

    get netNegative(): boolean {
        return this.computedNetAmount < 0;
    }

    submitRemittance(): void {
        if (this.isSubmitting || this.netNegative) return;
        this.isSubmitting = true;
        this.remittanceService.submit(
            this.selectedYear, this.selectedMonth, Array.from(this.selectedExpenseIds)
        ).subscribe({
            next: () => {
                this.snackBar.open('Remise soumise au gestionnaire.', 'OK', { duration: 3000 });
                this.isSubmitting = false;
                this.historyPage = 0;
                this.loadSummary();
                this.loadHistory();
            },
            error: (err) => {
                this.snackBar.open(err.error?.message || 'Erreur lors de la soumission.', 'Fermer', { duration: 4000 });
                this.isSubmitting = false;
            }
        });
    }

    acknowledge(remittanceId: number): void {
        if (this.isSubmitting || this.netNegative) return;
        this.isSubmitting = true;
        this.remittanceService.acknowledge(remittanceId, Array.from(this.selectedExpenseIds)).subscribe({
            next: () => {
                this.snackBar.open('Réception accusée.', 'OK', { duration: 3000 });
                this.isSubmitting = false;
                this.historyPage = 0;
                this.loadSummary();
                this.loadHistory();
            },
            error: (err) => {
                this.snackBar.open(err.error?.message || 'Erreur lors de l\'accusé.', 'Fermer', { duration: 4000 });
                this.isSubmitting = false;
            }
        });
    }

    initiateRemittance(): void {
        if (this.isSubmitting || this.netNegative) return;
        this.isSubmitting = true;
        this.remittanceService.initiate(
            this.selectedYear, this.selectedMonth, Array.from(this.selectedExpenseIds)
        ).subscribe({
            next: () => {
                this.snackBar.open('Réception enregistrée.', 'OK', { duration: 3000 });
                this.isSubmitting = false;
                this.historyPage = 0;
                this.loadSummary();
                this.loadHistory();
            },
            error: (err) => {
                this.snackBar.open(err.error?.message || 'Erreur lors de l\'initiation.', 'Fermer', { duration: 4000 });
                this.isSubmitting = false;
            }
        });
    }

    getSummaryStatusLabel(status: string | null): string {
        if (!status) {
            return this.summary?.alreadyRemittedAmount && this.summary.alreadyRemittedAmount > 0
                ? 'Nouveau versement'
                : 'Non soumis';
        }
        return status === 'RECEIVED' ? 'Tout remis' : 'En attente';
    }

    getHistoryStatusLabel(status: string | null): string {
        if (!status) return '—';
        return status === 'RECEIVED' ? 'Reçu' : 'En attente';
    }

    getStatusClass(status: string | null): string {
        if (!status) return 'status-none';
        return status === 'RECEIVED' ? 'status-received' : 'status-pending';
    }

    getMonthLabel(month: number): string {
        return this.months.find(m => m.value === month)?.label || String(month);
    }

    toggleHistoryExpand(remittanceId: number): void {
        if (this.expandedHistoryIds.has(remittanceId)) {
            this.expandedHistoryIds.delete(remittanceId);
        } else {
            this.expandedHistoryIds.add(remittanceId);
        }
    }

    isHistoryExpanded(remittanceId: number): boolean {
        return this.expandedHistoryIds.has(remittanceId);
    }

    hasDeposits(item: CashPeriodRemittance): boolean {
        return !!item.deposits?.length;
    }
}
