import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ItemService } from 'src/app/article/service/item.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-dashboard-stockkeeper-alerts',
  templateUrl: './dashboard-stockkeeper-alerts.component.html',
  styleUrls: ['./dashboard-stockkeeper-alerts.component.scss']
})
export class DashboardStockkeeperAlertsComponent implements OnInit {
  outOfStockArticles: any[] = [];
  imminentOutOfStockArticles: any[] = [];
  currentPageOutOfStock = 0;
  currentPageImminent = 0;
  pageSizeOutOfStock = 5;
  pageSizeImminent = 5;
  totalOutOfStockElement = 0;
  totalImminentElement = 0;
  loadingOutOfStock = true;
  loadingImminent = true;
  downloadingOutOfStock = false;
  downloadingImminent = false;

  private readonly exportPageSize = 200;

  constructor(
    private itemsService: ItemService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadArticlesOutStock(this.currentPageOutOfStock, this.pageSizeOutOfStock);
    this.loadArticlesImminent(this.currentPageImminent, this.pageSizeImminent);
  }

  loadArticlesOutStock(page: number, pageSize: number): void {
    this.loadingOutOfStock = true;
    this.itemsService.outOfStock(page, pageSize).subscribe({
      next: (data) => {
        this.outOfStockArticles = data.data.content;
        this.totalOutOfStockElement = data.data.totalElements;
        this.loadingOutOfStock = false;
      },
      error: () => { this.loadingOutOfStock = false; }
    });
  }

  loadArticlesImminent(page: number, pageSize: number): void {
    this.loadingImminent = true;
    this.itemsService.nextOutOfStock(page, pageSize).subscribe({
      next: (data) => {
        this.imminentOutOfStockArticles = data.data.content;
        this.totalImminentElement = data.data.totalElements;
        this.loadingImminent = false;
      },
      error: () => { this.loadingImminent = false; }
    });
  }

  onOutOfStockPageChange(event: PageEvent): void {
    this.currentPageOutOfStock = event.pageIndex;
    this.pageSizeOutOfStock = event.pageSize;
    this.loadArticlesOutStock(this.currentPageOutOfStock, this.pageSizeOutOfStock);
  }

  onImminentPageChange(event: PageEvent): void {
    this.currentPageImminent = event.pageIndex;
    this.pageSizeImminent = event.pageSize;
    this.loadArticlesImminent(this.currentPageImminent, this.pageSizeImminent);
  }

  getBadgeClass(stockQuantity: number): string {
    if (stockQuantity === 0) return 'qty-danger';
    if (stockQuantity <= 5) return 'qty-warning';
    return 'qty-success';
  }

  formatArticleName(article: { commercialName?: string | null; name?: string | null } | null): string {
    const commercialName = (article?.commercialName ?? '').trim();
    const name = (article?.name ?? '').trim();
    if (commercialName && name) {
      return `${commercialName} ${name}`;
    }
    return commercialName || name || '—';
  }

  downloadOutOfStock(): void {
    this.exportList(
      (page, size) => this.itemsService.outOfStock(page, size),
      this.totalOutOfStockElement,
      'articles-rupture-de-stock',
      (loading) => { this.downloadingOutOfStock = loading; }
    );
  }

  downloadImminent(): void {
    this.exportList(
      (page, size) => this.itemsService.nextOutOfStock(page, size),
      this.totalImminentElement,
      'articles-rupture-imminente',
      (loading) => { this.downloadingImminent = loading; }
    );
  }

  private exportList(
    fetchPage: (page: number, size: number) => Observable<any>,
    total: number,
    filenamePrefix: string,
    setLoading: (loading: boolean) => void
  ): void {
    if (total <= 0 || this.downloadingOutOfStock || this.downloadingImminent) {
      return;
    }
    setLoading(true);
    const pageCount = Math.ceil(total / this.exportPageSize);
    const requests = Array.from({ length: pageCount }, (_, page) =>
      fetchPage(page, this.exportPageSize).pipe(
        map((response) => (response?.data?.content ?? []) as any[])
      )
    );
    forkJoin(requests).subscribe({
      next: (pages) => {
        this.saveCsv(pages.flat(), filenamePrefix);
        setLoading(false);
      },
      error: () => {
        setLoading(false);
        this.alertService.showError('Le téléchargement de la liste a échoué.');
      }
    });
  }

  private saveCsv(articles: any[], filenamePrefix: string): void {
    const header = ['Nom commercial', 'Nom', 'Type', 'Quantité'];
    const lines = [header.map((cell) => this.csvCell(cell)).join(';')];
    for (const article of articles) {
      lines.push([
        article?.commercialName ?? '',
        article?.name ?? '',
        article?.type ?? '',
        article?.stockQuantity ?? 0
      ].map((cell) => this.csvCell(cell)).join(';'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private csvCell(value: unknown): string {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }
}
