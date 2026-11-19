import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CashDepositService } from '../../service/cash-deposit.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export type AllocationField = 'credit' | 'tontine' | 'newBalance' | 'catchup';

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
    /** Rattrapage réservé aux cotisations de jours passés (envoyé au serveur). */
    catchupAmount: number = 0;
    billetageData: any = {};
    catchupCaps: { collectionDate: string, cap?: number, capturedAmount?: number, openRemaining?: number }[] = [];
    catchupLines: { collectionDate: string, amount: number }[] = [];

    isSubmitting = false;
    private requestReference = '';
    /** Champs saisis à la main : ils priment sur la répartition automatique. */
    private readonly manualFields = new Set<AllocationField>();

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
        this.catchupCaps = data.catchupCaps || [];
    }

    ngOnInit(): void {
        this.requestReference = this.generateRequestReference();
        if (!this.date || !this.commercialUsername) {
            return;
        }
        this.cashDepositService.previewCatchupAllocation(this.commercialUsername, this.date).subscribe({
            next: (preview) => {
                this.remainingCredit = preview.remainingCredit ?? 0;
                this.remainingTontine = preview.remainingTontine ?? 0;
                this.remainingNewBalance = preview.remainingNewBalance ?? 0;
                this.catchupCaps = preview.slices || [];
                this.remainingAmount = preview.totalRemaining ?? this.dayRemaining();
                if (this.depositAmount > 0) {
                    this.autoAllocate();
                }
            },
            error: () => {
                this.snackBar.open('Les rattrapages du jour n\'ont pas pu être chargés.', 'Fermer', { duration: 3000 });
            }
        });
    }

    dayRemaining(): number {
        return this.remainingCredit + this.remainingTontine + this.remainingNewBalance + this.catchupTotal;
    }

    /** Reste rattrapages : somme des plafonds par date (rattrapage saisi, sans dépasser le reste dû). */
    get catchupTotal(): number {
        return this.catchupCaps.reduce((sum, slice) => sum + this.sliceLimit(slice), 0);
    }

    onBilletageChange(event: { totalAmount: number, ticketingData: any }) {
        this.depositAmount = event.totalAmount;
        this.billetageData = event.ticketingData;
        this.autoAllocate();
    }

    /**
     * Répartit le billetage. Sans saisie manuelle : crédit, tontine du jour, solde Nx, puis rattrapages,
     * le reste en surplus. Un rattrapage saisi à la main est réservé en premier ; les autres champs
     * saisis à la main sont conservés (plafonnés au billetage restant).
     */
    autoAllocate(): void {
        let remaining = this.depositAmount;
        const catchupManual = this.manualFields.has('catchup');
        if (catchupManual) {
            this.catchupAmount = Math.max(0, Math.min(Number(this.catchupAmount) || 0, this.catchupTotal, remaining));
            remaining -= this.catchupAmount;
        }
        this.creditAmount = this.take('credit', this.creditAmount, this.remainingCredit, remaining);
        remaining -= this.creditAmount;
        this.tontineAmount = this.take('tontine', this.tontineAmount, this.remainingTontine, remaining);
        remaining -= this.tontineAmount;
        this.newBalanceAmount = this.take('newBalance', this.newBalanceAmount, this.remainingNewBalance, remaining);
        remaining -= this.newBalanceAmount;
        if (!catchupManual) {
            this.catchupAmount = Math.max(0, Math.min(remaining, this.catchupTotal));
            remaining -= this.catchupAmount;
        }
        this.surplusAmount = Math.max(0, remaining);
        this.catchupLines = this.distributeCatchup(this.catchupAmount);
    }

    /** Valeur d'un champ : la saisie manuelle (plafonnée au disponible) ou le reste dû. */
    private take(field: AllocationField, current: number, due: number, available: number): number {
        const value = this.manualFields.has(field) ? (Number(current) || 0) : due;
        return Math.max(0, Math.min(value, available));
    }

    onCategoryChange(field?: AllocationField): void {
        if (field) {
            this.manualFields.add(field);
        }
        const categoriesTotal = (Number(this.creditAmount) || 0) + (Number(this.tontineAmount) || 0)
            + (Number(this.newBalanceAmount) || 0) + (Number(this.catchupAmount) || 0);
        this.surplusAmount = Math.max(0, this.depositAmount - categoriesTotal);
        this.catchupLines = this.distributeCatchup(this.catchupAmount);
    }

    /** Rattrapage saisi ce jour, sans dépasser le reste encore dû de la date. */
    private sliceLimit(slice: { cap?: number, capturedAmount?: number, openRemaining?: number }): number {
        if (slice.capturedAmount != null && slice.openRemaining != null) {
            return Math.min(Math.max(0, slice.capturedAmount), Math.max(0, slice.openRemaining));
        }
        return slice.cap || 0;
    }

    /** Répartit le rattrapage par date de cotisation, la plus ancienne d'abord (comme le serveur). */
    private distributeCatchup(catchup: number): { collectionDate: string, amount: number }[] {
        let left = Math.max(0, Number(catchup) || 0);
        return this.catchupCaps.map(slice => {
            const take = Math.min(left, this.sliceLimit(slice));
            left -= take;
            return { collectionDate: slice.collectionDate, amount: take };
        });
    }

    /** Le serveur refuse un rattrapage supérieur à ce qui est dû. */
    get catchupExceeded(): boolean {
        return (Number(this.catchupAmount) || 0) > this.catchupTotal + 0.01;
    }

    get allocationMismatch(): boolean {
        return Math.abs(
            ((Number(this.creditAmount) || 0) + (Number(this.tontineAmount) || 0) + (Number(this.newBalanceAmount) || 0)
                + (Number(this.catchupAmount) || 0) + (Number(this.surplusAmount) || 0)) - this.depositAmount
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

        if (this.catchupExceeded) {
            this.snackBar.open('Le rattrapage dépasse les rattrapages à encaisser.', 'Fermer', { duration: 3000 });
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
            catchupAmount: Number(this.catchupAmount) || 0,
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
                const message = err?.error?.message || 'Erreur lors du versement.';
                this.snackBar.open(message, 'Fermer', { duration: 4000 });
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
