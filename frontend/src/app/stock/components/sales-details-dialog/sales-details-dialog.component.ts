import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CreditService } from '../../../credit/service/credit.service';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { CreditSaleDetail, SoldValueHistoryEntry, SoldValueHistoryRow } from '../../models/sold-value-history.model';

export interface SalesDetailsDialogData {
  stockItemId: number;
  articleName: string;
  quantitySold: number;
  totalSoldValue?: number;
  weightedAverageUnitPrice?: number;
}

@Component({
  selector: 'app-sales-details-dialog',
  templateUrl: './sales-details-dialog.component.html',
  styleUrls: ['./sales-details-dialog.component.scss']
})
export class SalesDetailsDialogComponent implements OnInit {
  salesDetails: CreditSaleDetail[] = [];
  historyRows: SoldValueHistoryRow[] = [];
  loading = true;
  historyColumns = [
    'createdDate',
    'creditReference',
    'clientName',
    'movementType',
    'quantity',
    'saleUnitPrice',
    'deltaValue',
    'newTotalSoldValue'
  ];

  constructor(
    public dialogRef: MatDialogRef<SalesDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalesDetailsDialogData,
    private creditService: CreditService,
    private commercialStockService: CommercialStockService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      sales: this.creditService.getSalesDetails(this.data.stockItemId),
      history: this.commercialStockService.getSoldValueHistory(this.data.stockItemId).pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ sales, history }) => {
        this.salesDetails = sales?.data ?? [];
        this.historyRows = this.buildHistoryRows(history ?? []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sales details', err);
        this.loading = false;
      }
    });
  }

  private buildHistoryRows(history: SoldValueHistoryEntry[]): SoldValueHistoryRow[] {
    const clientByReference = new Map(
      this.salesDetails.map(sale => [sale.reference, sale.clientName])
    );

    return [...history]
      .sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime())
      .map(entry => ({
        ...entry,
        clientName: entry.creditReference
          ? clientByReference.get(entry.creditReference)
          : undefined
      }));
  }

  getMovementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      CREDIT_SALE: 'Vente crédit',
      CASH_SALE: 'Vente comptant',
      STOCK_IN: 'Entrée stock',
      RETURN: 'Retour',
      ADJUSTMENT: 'Ajustement'
    };
    return labels[type] ?? type;
  }

  get historyTotalFromDeltas(): number {
    return this.historyRows.reduce((sum, row) => sum + (row.deltaValue || 0), 0);
  }

  close(): void {
    this.dialogRef.close();
  }
}
