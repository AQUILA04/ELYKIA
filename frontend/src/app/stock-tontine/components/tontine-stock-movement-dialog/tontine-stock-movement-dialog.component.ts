import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TontineStockService } from '../../services/tontine-stock.service';
import { TontineStockMovement, TontineStockMovementType } from '../../models/tontine-stock-movement.model';

export interface TontineStockMovementDialogData {
  tontineStockId: number;
  articleName: string;
  quantityTaken: number;
}

@Component({
  selector: 'app-tontine-stock-movement-dialog',
  templateUrl: './tontine-stock-movement-dialog.component.html',
  styleUrls: ['./tontine-stock-movement-dialog.component.scss']
})
export class TontineStockMovementDialogComponent implements OnInit {
  movements: TontineStockMovement[] = [];
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<TontineStockMovementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TontineStockMovementDialogData,
    private tontineStockService: TontineStockService
  ) {}

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.tontineStockService.getStockMovements(this.data.tontineStockId).subscribe({
      next: (resp) => {
        const allMovements: TontineStockMovement[] = resp?.data ?? [];
        this.movements = [...allMovements].sort(
          (a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tontine stock movements', err);
        this.loading = false;
      }
    });
  }

  getMovementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      STOCK_IN: 'Entrée stock',
      TONTINE_DELIVERY: 'Livraison tontine',
      RETURN: 'Retour magasin'
    };
    return labels[type] || type;
  }

  getMovementTypeClass(type: string): string {
    const classes: Record<string, string> = {
      STOCK_IN: 'type-stock-in',
      TONTINE_DELIVERY: 'type-delivery',
      RETURN: 'type-return'
    };
    return classes[type] || '';
  }

  getQuantityByType(type: TontineStockMovementType): number {
    return this.movements
      .filter(m => m.movementType === type)
      .reduce((sum, m) => sum + (m.quantityMoved || 0), 0);
  }

  getQuantitySign(movementType: string): string {
    return movementType === 'STOCK_IN' ? '+' : '-';
  }

  getQuantityClass(movementType: string): string {
    return movementType === 'STOCK_IN' ? 'positive' : 'negative';
  }

  getReferenceLabel(movement: TontineStockMovement): string | null {
    if (movement.tontineDeliveryReference) {
      return `Livraison ${movement.tontineDeliveryReference}`;
    }
    if (movement.tontineDeliveryId) {
      return `Livraison #${movement.tontineDeliveryId}`;
    }
    if (movement.stockTontineRequestReference) {
      return `Demande ${movement.stockTontineRequestReference}`;
    }
    if (movement.stockTontineRequestId) {
      return `Demande #${movement.stockTontineRequestId}`;
    }
    if (movement.stockTontineReturnId) {
      return `Retour #${movement.stockTontineReturnId}`;
    }
    return null;
  }

  close(): void {
    this.dialogRef.close();
  }
}
