import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TontineDeliveryService, TontineReceiptVerification } from '../../../services/tontine-delivery.service';

@Component({
  selector: 'app-tontine-receipt-verify-dialog',
  templateUrl: './tontine-receipt-verify-dialog.component.html',
  styleUrls: ['./tontine-receipt-verify-dialog.component.scss'],
  standalone: false
})
export class TontineReceiptVerifyDialogComponent {
  code = '';
  loading = false;
  error = '';
  result: TontineReceiptVerification | null = null;

  constructor(
    private dialogRef: MatDialogRef<TontineReceiptVerifyDialogComponent>,
    private deliveryService: TontineDeliveryService
  ) {}

  verify(): void {
    const code = this.code.trim();
    if (!code || this.loading) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.result = null;
    this.deliveryService.verifyReceipt(code).subscribe({
      next: (response) => {
        this.loading = false;
        this.result = response.data;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'La vérification a échoué.';
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
