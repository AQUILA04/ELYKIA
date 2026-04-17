import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CashDepositService } from '../../service/cash-deposit.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-cash-deposit-modal',
    templateUrl: './cash-deposit-modal.component.html',
    styleUrls: ['./cash-deposit-modal.component.scss']
})
export class CashDepositModalComponent implements OnInit {

    commercialUsername: string;
    totalAmountToDeposit: number;
    remainingAmount: number;
    date: string;

    depositAmount: number = 0;
    billetageData: any = {};

    isSubmitting = false;

    constructor(
        public dialogRef: MatDialogRef<CashDepositModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private cashDepositService: CashDepositService,
        private snackBar: MatSnackBar
    ) {
        this.commercialUsername = data.commercialUsername;
        this.totalAmountToDeposit = data.totalAmountToDeposit;
        this.remainingAmount = data.remainingAmount;
        this.date = data.date;
    }

    ngOnInit(): void {
    }

    onBilletageChange(event: { totalAmount: number, ticketingData: any }) {
        this.depositAmount = event.totalAmount;
        this.billetageData = event.ticketingData;
    }

    submitDeposit() {
        if (this.depositAmount <= 0) {
            this.snackBar.open('Le montant doit être supérieur à 0.', 'Fermer', { duration: 3000 });
            return;
        }

        if (this.depositAmount > this.remainingAmount) {
            // Optional warning or block
        }

        this.isSubmitting = true;
        const deposit = {
            commercialUsername: this.commercialUsername,
            amount: this.depositAmount,
            billetage: JSON.stringify(this.billetageData),
            date: this.date
        };

        this.cashDepositService.createDeposit(deposit).subscribe({
            next: (res) => {
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
}
