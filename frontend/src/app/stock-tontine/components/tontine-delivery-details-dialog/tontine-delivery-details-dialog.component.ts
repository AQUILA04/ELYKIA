import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { TontineStockService } from '../../services/tontine-stock.service';
import { TontineStockMovement } from '../../models/tontine-stock-movement.model';

export interface TontineDeliveryDetailsDialogData {
  tontineStockId: number;
  articleName: string;
  quantityDistributed: number;
  weightedAverageUnitPrice: number;
}

export interface TontineSaleDetail {
  reference: string;
  clientName: string;
  quantity: number;
}

@Component({
  selector: 'app-tontine-delivery-details-dialog',
  templateUrl: './tontine-delivery-details-dialog.component.html',
  styleUrls: ['./tontine-delivery-details-dialog.component.scss']
})
export class TontineDeliveryDetailsDialogComponent implements OnInit {
  salesDetails: TontineSaleDetail[] = [];
  deliveries: TontineStockMovement[] = [];
  loading = true;
  displayedColumns = ['reference', 'clientName', 'quantity'];

  constructor(
    public dialogRef: MatDialogRef<TontineDeliveryDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TontineDeliveryDetailsDialogData,
    private tontineStockService: TontineStockService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      sales: this.tontineStockService.getSalesDetails(this.data.tontineStockId),
      movements: this.tontineStockService.getStockMovements(this.data.tontineStockId)
    }).subscribe({
      next: ({ sales, movements }) => {
        this.salesDetails = sales?.data ?? [];
        const allMovements: TontineStockMovement[] = movements?.data ?? [];
        this.deliveries = allMovements
          .filter(m => m.movementType === 'TONTINE_DELIVERY')
          .sort((a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime());
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading tontine delivery details', err);
        this.loading = false;
      }
    });
  }

  get totalDistributedValue(): number {
    return this.data.quantityDistributed * (this.data.weightedAverageUnitPrice || 0);
  }

  get historyTotalQuantity(): number {
    return this.deliveries.reduce((sum, row) => sum + (row.quantityMoved || 0), 0);
  }

  close(): void {
    this.dialogRef.close();
  }
}
