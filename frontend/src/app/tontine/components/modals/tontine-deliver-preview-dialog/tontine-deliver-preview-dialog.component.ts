import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TontineDeliveryItem } from '../../../types/tontine.types';

export interface TontineDeliverPreviewData {
  clientName: string;
  reference?: string;
  items: readonly TontineDeliveryItem[];
  totalAmount: number;
  /** Solde net cotisé du membre (cotisations moins part société, compléments inclus). */
  netContribution: number;
}

/** `confirm` : remettre la commande ; `reduce` : ouvrir l'édition de la commande. */
export type TontineDeliverPreviewResult = 'confirm' | 'reduce' | undefined;

/**
 * Dernier réglage avant la remise : articles, solde net, reste à payer ou reliquat.
 * La confirmation n'est possible que si le solde couvre la commande.
 */
@Component({
  selector: 'app-tontine-deliver-preview-dialog',
  templateUrl: './tontine-deliver-preview-dialog.component.html',
  styleUrls: ['./tontine-deliver-preview-dialog.component.scss'],
  standalone: false
})
export class TontineDeliverPreviewDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<TontineDeliverPreviewDialogComponent, TontineDeliverPreviewResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: TontineDeliverPreviewData
  ) {}

  get netContribution(): number {
    return Math.max(0, this.data.netContribution || 0);
  }

  get total(): number {
    return Math.max(0, this.data.totalAmount || 0);
  }

  /** Reste à payer : la commande dépasse le solde net. */
  get amountDue(): number {
    const gap = this.total - this.netContribution;
    return gap > 0.005 ? Math.round(gap * 100) / 100 : 0;
  }

  /** Reliquat à restituer : la commande est inférieure au solde net. */
  get refundableBalance(): number {
    const gap = this.netContribution - this.total;
    return gap > 0.005 ? Math.round(gap * 100) / 100 : 0;
  }

  get canConfirm(): boolean {
    return this.amountDue <= 0 && (this.data.items?.length ?? 0) > 0;
  }

  confirm(): void {
    if (this.canConfirm) {
      this.dialogRef.close('confirm');
    }
  }

  reduce(): void {
    this.dialogRef.close('reduce');
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
