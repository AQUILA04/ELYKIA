import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StockReceptionService } from '../../services/stock-reception.service';
import { StockReception, StockReceptionItem } from '../../../core/models/stock-reception.model';

@Component({
  selector: 'app-stock-reception-detail',
  templateUrl: './stock-reception-detail.component.html',
  styleUrls: ['./stock-reception-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockReceptionDetailComponent implements OnInit {
  reception: StockReception | null = null;
  receptionItems: StockReceptionItem[] = [];
  isReceptionLoading = false;
  isItemsLoading = false;
  itemsPage = 0;
  readonly itemsPageSize = 30;
  itemsTotalElements = 0;
  hasMoreItems = true;

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
    this.isReceptionLoading = true;
    this.stockReceptionService.getReception(id).subscribe({
      next: (response) => {
        this.reception = response.data;
        this.resetAndLoadItems();
        this.isReceptionLoading = false;
      },
      error: () => {
        this.isReceptionLoading = false;
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.hasMoreItems || this.isItemsLoading || !this.reception) {
      return;
    }

    const reachedBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 240;
    if (reachedBottom) {
      this.loadMoreItems();
    }
  }

  resetAndLoadItems(): void {
    this.receptionItems = [];
    this.itemsPage = 0;
    this.itemsTotalElements = 0;
    this.hasMoreItems = true;
    this.loadMoreItems();
  }

  loadMoreItems(): void {
    if (!this.reception || this.isItemsLoading || !this.hasMoreItems) {
      return;
    }

    this.isItemsLoading = true;
    this.stockReceptionService.getReceptionItems(this.reception.id, this.itemsPage, this.itemsPageSize).subscribe({
      next: (response) => {
        const data = response?.data;
        const pageContent: StockReceptionItem[] = data?.content ?? [];
        const totalElements = data?.page?.totalElements ?? 0;
        const totalPages = data?.page?.totalPages ?? 0;

        this.receptionItems = [...this.receptionItems, ...pageContent];
        this.itemsTotalElements = totalElements;
        this.itemsPage += 1;
        this.hasMoreItems = this.itemsPage < totalPages;
        this.isItemsLoading = false;
      },
      error: () => {
        this.isItemsLoading = false;
      }
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
