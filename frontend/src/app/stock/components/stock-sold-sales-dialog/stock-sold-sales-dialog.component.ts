import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CommercialStockService } from '../../services/commercial-stock.service';
import { StockLinkedSale, StockLinkedSalesResponse } from '../../models/stock-linked-sales.model';

export interface StockSoldSalesDialogData {
  stockId: number;
  collector: string;
  monthLabel: string;
  year: number;
  stockSoldValue: number;
}

@Component({
  selector: 'app-stock-sold-sales-dialog',
  templateUrl: './stock-sold-sales-dialog.component.html',
  styleUrls: ['./stock-sold-sales-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockSoldSalesDialogComponent implements OnInit {
  loading = true;
  error: string | null = null;
  response: StockLinkedSalesResponse | null = null;

  constructor(
    public dialogRef: MatDialogRef<StockSoldSalesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StockSoldSalesDialogData,
    private commercialStockService: CommercialStockService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSales();
  }

  loadSales(): void {
    this.loading = true;
    this.error = null;
    this.commercialStockService.getLinkedSales(this.data.stockId).subscribe({
      next: (response) => {
        this.response = response;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading linked sales', err);
        this.error = 'Impossible de charger les ventes liées à ce stock.';
        this.loading = false;
      }
    });
  }

  get sales(): StockLinkedSale[] {
    return this.response?.sales ?? [];
  }

  getStatusLabel(status?: string): string {
    if (!status) {
      return '—';
    }
    const labels: Record<string, string> = {
      INPROGRESS: 'En cours',
      SETTLED: 'Clôturé',
      CREATED: 'Créé',
      VALIDATED: 'Validé',
      CASH: 'Comptant'
    };
    return labels[status] ?? status;
  }

  getStatusClass(status?: string): string {
    if (status === 'INPROGRESS') {
      return 'status-inprogress';
    }
    if (status === 'SETTLED') {
      return 'status-settled';
    }
    return 'status-other';
  }

  openCredit(row: StockLinkedSale): void {
    if (!row?.creditId) {
      return;
    }
    this.dialogRef.close();
    this.router.navigate(['/credit/details', row.creditId]);
  }

  close(): void {
    this.dialogRef.close();
  }
}
