import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StockReceptionService } from '../../services/stock-reception.service';

@Component({
  selector: 'app-stock-reception-detail',
  templateUrl: './stock-reception-detail.component.html',
  styleUrls: ['./stock-reception-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockReceptionDetailComponent implements OnInit {
  reception: any | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockReceptionService: StockReceptionService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReception(parseInt(id, 10));
    }
  }

  loadReception(id: number): void {
    this.stockReceptionService.getReception(id).subscribe({
      next: (response) => { this.reception = response.data; },
      error: () => {}
    });
  }

  downloadPdf(): void {
    if (this.reception) {
      this.stockReceptionService.downloadPdf(this.reception.id).subscribe({
        next: (response) => {
          const blob = new Blob([response], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `RECEPTION_${this.reception?.reference}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {}
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/stock/receptions']);
  }
}
