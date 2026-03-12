import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { StockReceptionService } from '../../services/stock-reception.service';
import { StockReception } from '../../../core/models/stock-reception.model';

@Component({
  selector: 'app-stock-reception-detail',
  templateUrl: './stock-reception-detail.component.html',
  styleUrls: ['./stock-reception-detail.component.scss']
})
export class StockReceptionDetailComponent implements OnInit {
  reception: StockReception | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockReceptionService: StockReceptionService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReception(parseInt(id, 10));
    }
  }

  loadReception(id: number): void {
    this.spinner.show();
    this.stockReceptionService.getReception(id).subscribe({
      next: (response) => {
        this.reception = response;
        this.spinner.hide();
      },
      error: () => {
        this.spinner.hide();
        // Handle error (e.g., show a message or redirect)
      }
    });
  }

  downloadPdf(): void {
    if (this.reception) {
      this.spinner.show();
      this.stockReceptionService.downloadPdf(this.reception.id).subscribe({
        next: (response) => {
          const blob = new Blob([response], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `RECEPTION_${this.reception?.reference}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.spinner.hide();
        },
        error: () => {
          this.spinner.hide();
          // Handle error
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/stock/receptions']);
  }
}
