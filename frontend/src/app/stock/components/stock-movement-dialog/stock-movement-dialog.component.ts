import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommercialStockService } from '../../services/commercial-stock.service';

@Component({
  selector: 'app-stock-movement-dialog',
  templateUrl: './stock-movement-dialog.component.html',
  styleUrls: ['./stock-movement-dialog.component.scss']
})
export class StockMovementDialogComponent implements OnInit {
  movements: any[] = [];
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<StockMovementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private commercialStockService: CommercialStockService
  ) {}

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.commercialStockService.getStockMovements(this.data.stockItemId).subscribe({
      next: (resp) => {
        this.movements = resp.data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading stock movements', err);
        this.loading = false;
      }
    });
  }

  getMovementTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'CREDIT_SALE': 'Vente Crédit',
      'CASH_SALE': 'Vente Cash',
      'STOCK_IN': 'Entrée Stock',
      'RETURN': 'Retour',
      'ADJUSTMENT': 'Ajustement'
    };
    return labels[type] || type;
  }

  getMovementTypeClass(type: string): string {
    const classes: { [key: string]: string } = {
      'CREDIT_SALE': 'type-credit',
      'CASH_SALE': 'type-cash',
      'STOCK_IN': 'type-stock-in',
      'RETURN': 'type-return',
      'ADJUSTMENT': 'type-adjustment'
    };
    return classes[type] || '';
  }

  getTotalQuantity(): number {
    return this.movements.reduce((sum, m) => sum + (m.quantityMoved || 0), 0);
  }

  getQuantitySign(movementType: string): string {
    return movementType === 'STOCK_IN' ? '+' : '-';
  }

  getQuantityClass(movementType: string): string {
    return movementType === 'STOCK_IN' ? 'positive' : 'negative';
  }

  getReferenceLabel(movement: any): string | null {
    if (movement.stockReturnId) {
      if (movement.movementType === 'STOCK_IN') {
        return `Livraison #${movement.stockReturnId}`;
      }
      return `Retour #${movement.stockReturnId}`;
    }
    return null;
  }

  close(): void {
    this.dialogRef.close();
  }
}
