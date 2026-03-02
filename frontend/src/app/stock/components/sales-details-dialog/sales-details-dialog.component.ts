import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreditService } from '../../../credit/service/credit.service';

@Component({
  selector: 'app-sales-details-dialog',
  templateUrl: './sales-details-dialog.component.html',
  styleUrls: ['./sales-details-dialog.component.scss']
})
export class SalesDetailsDialogComponent implements OnInit {
  salesDetails: any[] = [];
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<SalesDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private creditService: CreditService
  ) {}

  ngOnInit(): void {
    this.loadSalesDetails();
  }

  loadSalesDetails(): void {
    this.creditService.getSalesDetails(this.data.stockItemId).subscribe({
      next: (data) => {
        this.salesDetails = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sales details', err);
        this.loading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
