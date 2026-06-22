import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CashDepositService } from '../../service/cash-deposit.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-cash-deposit-modal',
    templateUrl: './cash-deposit-modal.component.html',
    styleUrls: ['./cash-deposit-modal.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class CashDepositModalComponent implements OnInit {

    commercialUsername: string;
    remainingAmount: number;
    remainingCredit: number;
    remainingTontine: number;
    remainingNewBalance: number;
    date: string;

    depositAmount: number = 0;
    creditAmount: number = 0;
    tontineAmount: number = 0;
    newBalanceAmount: number = 0;
    surplusAmount: number = 0;
    billetageData: any = {};

    isSubmitting = false;
    private requestReference = '';

    constructor(
        public dialogRef: MatDialogRef<CashDepositModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private cashDepositService: CashDepositService,
        private snackBar: MatSnackBar
    ) {
        this.commercialUsername = data.commercialUsername;
        this.remainingAmount = data.remainingAmount;
        this.remainingCredit = data.remainingCredit ?? 0;
        this.remainingTontine = data.remainingTontine ?? 0;
        this.remainingNewBalance = data.remainingNewBalance ?? 0;
        this.date = data.date;
    }

    ngOnInit(): void {
        this.requestReference = this.generateRequestReference();
    }

    onBilletageChange(event: { totalAmount: number, ticketingData: any }) {
        this.depositAmount = event.totalAmount;
        this.billetageData = event.ticketingData;
        this.autoAllocate();
    }

    autoAllocate(): void {
        let remaining = this.depositAmount;
        this.creditAmount = Math.min(remaining, this.remainingCredit);
        remaining -= this.creditAmount;
        this.tontineAmount = Math.min(remaining, this.remainingTontine);
        remaining -= this.tontineAmount;
        this.newBalanceAmount = Math.min(remaining, this.remainingNewBalance);
        remaining -= this.newBalanceAmount;
        this.surplusAmount = Math.max(0, remaining);
    }

    onCategoryChange(): void {
        const categoriesTotal = this.creditAmount + this.tontineAmount + this.newBalanceAmount;
        this.surplusAmount = Math.max(0, this.depositAmount - categoriesTotal);
    }

    get allocationMismatch(): boolean {
        return Math.abs(
            (this.creditAmount + this.tontineAmount + this.newBalanceAmount + this.surplusAmount) - this.depositAmount
        ) > 0.01;
    }

    /** Écart billetage physique vs solde système (positif = surplus, négatif = manquant). */
    get physicalGap(): number {
        return this.depositAmount - this.remainingAmount;
    }

    get hasPhysicalSurplus(): boolean {
        return this.depositAmount > 0 && this.physicalGap > 0.01;
    }

    get hasPhysicalShortage(): boolean {
        return this.depositAmount > 0 && this.physicalGap < -0.01;
    }

    submitDeposit() {
        if (this.isSubmitting) {
            return;
        }

        if (this.depositAmount <= 0) {
            this.snackBar.open('Le montant doit être supérieur à 0.', 'Fermer', { duration: 3000 });
            return;
        }

        if (this.allocationMismatch) {
            this.snackBar.open('La répartition doit correspondre au total saisi.', 'Fermer', { duration: 3000 });
            return;
        }

        this.isSubmitting = true;
        const deposit = {
            commercialUsername: this.commercialUsername,
            amount: this.depositAmount,
            creditAmount: this.creditAmount,
            tontineAmount: this.tontineAmount,
            newBalanceAmount: this.newBalanceAmount,
            surplusAmount: this.surplusAmount,
            billetage: JSON.stringify(this.billetageData),
            date: this.date,
            reference: this.requestReference
        };

        this.cashDepositService.createDeposit(deposit).subscribe({
            next: () => {
                this.snackBar.open('Versement effectué avec succès !', 'OK', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => {
                console.error(err);
                this.snackBar.open('Erreur lors du versement.', 'Fermer', { duration: 3000 });
                this.isSubmitting = false;
            }
        });
    }

    private generateRequestReference(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `DEP-WEB-${crypto.randomUUID()}`;
        }
        return `DEP-WEB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
}
