import { Component, OnInit } from '@angular/core';
import { CashPeriodRemittanceService } from '../../service/cash-period-remittance.service';
import { CashPeriodRemittance, CashPeriodRemittanceSummary } from '../../models/cash-period-remittance.model';
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
    isLoading = false;
    isSubmitting = false;
    isManager = false;
    isSecretary = false;

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
        this.loadHistory();
    }

    loadSummary(): void {
        this.isLoading = true;
        this.remittanceService.getSummary(this.selectedYear, this.selectedMonth).subscribe({
            next: (summary) => {
                this.summary = summary;
                this.isLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
            }
        });
    }

    loadHistory(): void {
        this.remittanceService.list().subscribe({
            next: (res) => {
                this.history = res.content || [];
            },
            error: (err) => console.error(err)
        });
    }

    submitRemittance(): void {
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        this.remittanceService.submit(this.selectedYear, this.selectedMonth).subscribe({
            next: () => {
                this.snackBar.open('Remise soumise au gestionnaire.', 'OK', { duration: 3000 });
                this.isSubmitting = false;
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
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        this.remittanceService.acknowledge(remittanceId).subscribe({
            next: () => {
                this.snackBar.open('Réception accusée.', 'OK', { duration: 3000 });
                this.isSubmitting = false;
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
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        this.remittanceService.initiate(this.selectedYear, this.selectedMonth).subscribe({
            next: () => {
                this.snackBar.open('Réception enregistrée.', 'OK', { duration: 3000 });
                this.isSubmitting = false;
                this.loadSummary();
                this.loadHistory();
            },
            error: (err) => {
                this.snackBar.open(err.error?.message || 'Erreur lors de l\'initiation.', 'Fermer', { duration: 4000 });
                this.isSubmitting = false;
            }
        });
    }

    getStatusLabel(status: string | null): string {
        if (!status) return 'Non soumis';
        return status === 'RECEIVED' ? 'Reçu' : 'En attente';
    }

    getStatusClass(status: string | null): string {
        if (!status) return 'status-none';
        return status === 'RECEIVED' ? 'status-received' : 'status-pending';
    }

    getMonthLabel(month: number): string {
        return this.months.find(m => m.value === month)?.label || String(month);
    }
}
