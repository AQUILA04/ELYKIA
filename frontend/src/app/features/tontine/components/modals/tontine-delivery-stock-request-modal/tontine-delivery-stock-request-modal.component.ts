import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TontineDeliveryStockPreview } from '@features/stock-tontine/services/stock-tontine-request.service';

@Component({
  selector: 'app-tontine-delivery-stock-request-modal',
  templateUrl: './tontine-delivery-stock-request-modal.component.html',
  styleUrls: ['./tontine-delivery-stock-request-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TontineDeliveryStockRequestModalComponent {
  constructor(
    public dialogRef: MatDialogRef<TontineDeliveryStockRequestModalComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: TontineDeliveryStockPreview
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
